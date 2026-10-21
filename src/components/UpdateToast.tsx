import { useAppUpdate } from '../state/appUpdate'

/** "Yeni sürüm hazır": shown on the map when a new version has downloaded. */
export function UpdateToast() {
  const { needRefresh, update, dismiss } = useAppUpdate()
  if (!needRefresh) return null
  return (
    <div className="update-toast" role="status" data-update>
      <span>✨ Yeni sürüm hazır.</span>
      <button className="btn btn-small" onClick={update}>
        Yenile
      </button>
      <button className="link" onClick={dismiss}>
        Sonra
      </button>
    </div>
  )
}
