import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Mascot, type MascotMood } from './Mascot'

describe('Mascot', () => {
  it.each<MascotMood>(['idle', 'happy', 'sad', 'cheer', 'sleep', 'think'])('renders the %s mood', (mood) => {
    render(<Mascot mood={mood} say={mood === 'cheer' ? 'Harika!' : null} />)
    expect(screen.getAllByRole('img', { name: 'Notiş' }).length).toBeGreaterThan(0)
  })

  it('shows the speech bubble', () => {
    render(<Mascot say="Merhaba" />)
    expect(screen.getByText('Merhaba')).toBeInTheDocument()
  })
})
