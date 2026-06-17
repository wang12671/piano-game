const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

// 云函数入口函数
exports.main = async (event, context) => {
  const db = cloud.database();
  try {
    // 获取用户 openid
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID;

    // 验证参数
    if (!event.score || typeof event.score !== "number") {
      return {
        success: false,
        message: "参数错误：score 必须是数字",
      };
    }

    const score = event.score;

    // 确保集合存在（如果不存在则创建）
    try {
      await db.createCollection("scores");
    } catch (e) {
      // 集合已存在，忽略错误
    }

    // 查询用户是否已有记录
    const userRecord = await db
      .collection("scores")
      .where({
        _openid: openid,
      })
      .get();

    // 根据情况更新或插入
    if (userRecord.data.length > 0) {
      // 有记录，检查是否需要更新
      const existingScore = userRecord.data[0].score;
      if (score > existingScore) {
        // 新分数更高，更新记录
        await db
          .collection("scores")
          .doc(userRecord.data[0]._id)
          .update({
            data: {
              score: score,
              createTime: db.serverDate(),
              updateTime: db.serverDate(),
            },
          });
      }
    } else {
      // 无记录，插入新记录
      await db.collection("scores").add({
        data: {
          _openid: openid,
          score: score,
          createTime: db.serverDate(),
        },
      });
    }

    // 查询用户当前排名
    const currentUserRecord = await db
      .collection("scores")
      .where({
        _openid: openid,
      })
      .get();

    const userCreateTime = currentUserRecord.data[0].createTime;

    // 排名 = 分数更高的记录数 + 同分但更早创建的记录数 + 1
    const higherScoreCount = await db
      .collection("scores")
      .where({
        score: db.command.gt(score),
      })
      .count();

    const sameScoreEarlierCount = await db
      .collection("scores")
      .where({
        score: score,
        createTime: db.command.lt(userCreateTime),
      })
      .count();

    const rank = higherScoreCount.total + sameScoreEarlierCount.total + 1;

    return {
      success: true,
      message: "上传成功",
      rank: rank,
    };
  } catch (error) {
    return {
      success: false,
      message: "上传失败：" + error.message,
    };
  }
};
