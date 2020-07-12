export const getTimeString = (date: Readonly<Date>) =>
  date.getHours().toString().padStart(2, '0') +
  ':' +
  date.getMinutes().toString().padStart(2, '0')

export const getDayString = (date: Readonly<Date>) =>
  (date.getMonth() + 1).toString().padStart(2, '0') +
  '/' +
  date.getDate().toString().padStart(2, '0')

export const getFullDayString = (date: Readonly<Date>) =>
  date.getFullYear() + '/' + getDayString(date)

export const getFullDayWithTimeString = (date: Readonly<Date>) =>
  getFullDayString(date) + ' ' + getTimeString(date)

/**
 * 2つの日時を比べ、差異がない部分については省略したものを出力する
 * @param ofDate 出力する日時
 * @param fromDate 比較する日時
 */
export const getDateRepresentationWithoutSameDate = (
  ofDate: Readonly<Date>,
  fromDate: Readonly<Date>
) => {
  const timeString = getTimeString(ofDate)
  if (fromDate.getFullYear() !== ofDate.getFullYear()) {
    return getFullDayString(ofDate) + ' ' + timeString
  }
  if (
    fromDate.getDate() !== ofDate.getDate() ||
    fromDate.getMonth() !== ofDate.getMonth()
  ) {
    return getDayString(ofDate) + ' ' + timeString
  }
  return timeString
}

export const getDisplayDate = (createdAt: string, updatedAt: string) => {
  const createdDate = new Date(createdAt)
  if (createdAt === updatedAt) {
    return getTimeString(createdDate)
  } else {
    const updatedDate = new Date(updatedAt)
    return getDateRepresentationWithoutSameDate(updatedDate, createdDate)
  }
}

export const getCreatedDate = (createdAt: string) => {
  const createdDate = new Date(createdAt)
  const now = new Date()
  return getDateRepresentationWithoutSameDate(createdDate, now)
}
