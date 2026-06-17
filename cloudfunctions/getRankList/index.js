const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const db = cloud.database()
  try {
    // 确保集合存在
    try {
      await db.createCollection('scores')
    } catch (e) {
      // 集合已存在，忽略
    }

    const limit = event.limit || 10

    const result = await db
      .collection('scores')
      .orderBy('score', 'desc')
      .limit(limit)
      .get()

    const data = result.data.map((item, index) => ({
      _id: item._id,
      nickname: item.nickname,
      avatarUrl: item.avatarUrl,
      score: item.score,
      rank: index + 1
    }))

    return {
      success: true,
      data
    }
  } catch (err) {
    return {
      success: false,
      errMsg: err.message
    }
  }
}
