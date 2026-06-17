const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const res = await db.collection('piano_scores').where({ _openid: openid }).orderBy('score', 'desc').limit(1).get()

  if (res.data && res.data.length > 0) {
    return { success: true, score: res.data[0].score }
  }
  return { success: true, score: 0 }
}