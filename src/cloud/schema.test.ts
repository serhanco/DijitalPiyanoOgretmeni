// @vitest-environment node
// The Supabase schema run in PGlite (Postgres in WebAssembly) with a stand-in for Supabase's auth schema:
// the row level security must let a learner see only themselves and their friends.

import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import schema from '../../supabase/schema.sql?raw'

const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'
const C = '00000000-0000-0000-0000-00000000000c'

const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public, auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`

let pg: PGlite

/** Run as the signed-in learner `id` (null: as the database owner). */
async function as<T>(id: string | null, sql: string, params: unknown[] = []) {
  await pg.exec(
    id ? `set role authenticated; select set_config('request.jwt.claim.sub', '${id}', false);` : 'reset role;',
  )
  return (await pg.query<T>(sql, params)).rows
}

beforeAll(async () => {
  pg = new PGlite()
  await pg.exec(SUPABASE_STUB)
  await pg.exec(schema)
  await pg.exec(`insert into auth.users values ('${A}'), ('${B}'), ('${C}')`)
  for (const [id, name] of [
    [A, 'Ayşe'],
    [B, 'Barış'],
    [C, 'Cem'],
  ])
    await as(id, `insert into public.players (user_id, name) values ($1, $2)`, [id, name])
}, 60000)

describe('cloud schema', () => {
  it('keeps progress private', async () => {
    await as(A, `insert into public.progress (user_id, data) values ($1, '{"v":1}')`, [A])
    expect(await as(A, 'select user_id from public.progress')).toHaveLength(1)
    expect(await as(B, 'select user_id from public.progress')).toHaveLength(0)
    await expect(as(B, `insert into public.progress (user_id, data) values ($1, '{}')`, [A])).rejects.toThrow()
  })

  it('gives every player a six-letter code', async () => {
    const [{ code }] = await as<{ code: string }>(A, 'select code from public.players where user_id = $1', [A])
    expect(code).toMatch(/^[0-9A-F]{6}$/)
  })

  it('shows only friends, after add_friend with a code', async () => {
    expect(await as(A, 'select name from public.players')).toEqual([{ name: 'Ayşe' }])
    const [{ code }] = await as<{ code: string }>(B, 'select code from public.players where user_id = $1', [B])
    const [{ add_friend }] = await as<{ add_friend: string }>(A, 'select public.add_friend($1)', [code.toLowerCase()])
    expect(add_friend).toBe(B)
    expect((await as<{ name: string }>(A, 'select name from public.players order by name')).map((r) => r.name)).toEqual(
      ['Ayşe', 'Barış'],
    )
    // Both ways, and Cem still sees no one.
    expect(await as(B, 'select name from public.players where user_id = $1', [A])).toHaveLength(1)
    expect(await as(C, 'select name from public.players')).toEqual([{ name: 'Cem' }])
    expect((await as<{ add_friend: string | null }>(A, `select public.add_friend('ZZZZZZ')`))[0].add_friend).toBeNull()
    const [{ code: own }] = await as<{ code: string }>(A, 'select code from public.players where user_id = $1', [A])
    expect((await as<{ add_friend: string }>(A, 'select public.add_friend($1)', [own]))[0].add_friend).toBe(A)
  })

  it('never lets a learner write a friendship or a stranger’s row directly', async () => {
    await expect(as(C, `insert into public.friends (user_id, friend_id) values ($1, $2)`, [C, A])).rejects.toThrow()
    await as(C, `update public.players set week_xp = 999 where user_id = $1`, [A])
    expect(
      (await as<{ week_xp: number }>(null, 'select week_xp from public.players where user_id = $1', [A]))[0],
    ).toEqual({
      week_xp: 0,
    })
  })

  it('sends cheers only to friends', async () => {
    await as(A, `insert into public.events (from_id, to_id, kind) values ($1, $2, 'cheer')`, [A, B])
    await expect(
      as(C, `insert into public.events (from_id, to_id, kind) values ($1, $2, 'cheer')`, [C, A]),
    ).rejects.toThrow()
    expect(await as(B, 'select kind from public.events')).toEqual([{ kind: 'cheer' }])
    expect(await as(C, 'select kind from public.events')).toEqual([])
  })

  it('unfriends both ways and deletes an account with its rows', async () => {
    await as(B, 'delete from public.friends')
    expect(await as(A, 'select friend_id from public.friends')).toHaveLength(1)
    await as(B, 'select public.remove_friend($1)', [A])
    expect(await as(A, 'select friend_id from public.friends')).toEqual([])
    await as(A, 'select public.delete_account()')
    expect(await as(null, 'select id from auth.users where id = $1', [A])).toEqual([])
    expect(await as(null, 'select user_id from public.progress')).toEqual([])
  })
})
