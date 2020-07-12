export const isMac = () => navigator.platform.includes('Mac')

const ua = navigator.userAgent.toLowerCase()

export const isSafari = () => {
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('edge')
}

export const isIOS = () => {
  return (
    isIOSApp() ||
    ua.includes('iphone') ||
    ua.includes('ipod') ||
    ua.includes('ipad')
  )
}

export const isIOSApp = () => {
  return ua.includes('traq-ios')
}

export const isPWA = () => {
  return matchMedia('(display-mode: standalone)').matches
}

export const isTouchDevice = () => {
  return isIOS() || ua.includes('android')
}

// https://github.com/ianstormtaylor/slate/blob/7377266b43451c4be44a1442aa1076ef3d13227e/packages/slate-dev-environment/src/index.js#L74-L79
export const checkLevel2InputEventsSupport = () => {
  const element = document.createElement('div')
  element.contentEditable = 'true'
  return 'onbeforeinput' in element
}

export const checkBadgeAPISupport = () => {
  return !!navigator.setAppBadge && !!navigator.clearAppBadge
}
