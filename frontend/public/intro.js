// The first-visit intro (index.html): plays once a session, never with reduced motion. Runs in
// <head>, before the first paint, so a visitor who has seen it never glimpses it.
;(function () {
  var html = document.documentElement
  try {
    var seen = sessionStorage.getItem('bk-intro') || matchMedia('(prefers-reduced-motion: reduce)').matches
    html.dataset.intro = seen ? 'seen' : 'playing'
    sessionStorage.setItem('bk-intro', '1')
  } catch {
    html.dataset.intro = 'seen'
  }
  // Clear the panel and the scroll lock once the timeline (about 4.6 s from the first paint) is over.
  if (html.dataset.intro === 'playing')
    setTimeout(function () {
      html.dataset.intro = 'seen'
    }, 4600)
})()
