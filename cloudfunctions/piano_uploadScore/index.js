const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  const db = cloud.database()
  try {
    try { await db.createCollection('piano_scores') } catch (e) {}
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    if (!event.score || typeof event.score !== 'number') {
      return { success: false, message: '参数错误' }
    }
    const score = event.score

    const userRecord = await db.collection('piano_scores').where({ _openid: openid }).get()

    if (userRecord.data.length > 0) {
      const existingScore = userRecord.data[0].score
      if (score > existingScore) {
        await db.collection('piano_scores').doc(userRecord.data[0]._id).update({
          data: { score: score, updateTime: db.serverDate() }
        })
      }
    } else {
      await db.collection('piano_scores').add({
        data: { _openid: openid, score: score, createTime: db.serverDate() }
      })
    }

    const currentUserRecord = await db.collection('piano_scores').where({ _openid: openid }).get()
    const userCreateTime = currentUserRecord.data[0].createTime

    const higherScoreCount = await db.collection('piano_scores').where({ score: db.command.gt(score) }).count()
    const sameScoreEarlierCount = await db.collection('piano_scores').where({
      score: score,
      createTime: db.command.lt(userCreateTime)
    }).count()

    const rank = higherScoreCount.total + sameScoreEarlierCount.total + 1

    return { success: true, message: '上传成功', rank: rank }
  } catch (error) {
    return { success: false, message: '上传失败：' + error.message }
  }
}