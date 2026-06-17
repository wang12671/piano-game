const { playNote } = require('../../utils/audio')

Page({
  data: {
    gameState: 'idle',
    score: 0,
    bestScore: 0,
    rows: [],
    showEndModal: false,
    uploadResult: '',
  },

  _timer: null,
  _rowHeight: 0,
  _visibleRows: 6,
  _totalRows: 7,

  onLoad() {
    const bestScore = wx.getStorageSync('bestScore') || 0
    this.setData({ bestScore })
    // 获取屏幕信息计算行高
    const sysInfo = wx.getSystemInfoSync()
    // 游戏区域高度约为屏幕高度的70%
    this._rowHeight = Math.floor(sysInfo.windowHeight * 0.7 / this._visibleRows)
  },

  // 生成新行（1个黑块，位置随机）
  _generateRow() {
    const blocks = [0, 0, 0, 0]
    blocks[Math.floor(Math.random() * 4)] = 1
    return { blocks }
  },

  // 初始化游戏行
  _initRows() {
    const rows = []
    for (let i = 0; i < this._totalRows; i++) {
      // 底部3行不生成黑块，给玩家反应时间
      if (i >= this._totalRows - 3) {
        rows.push({ blocks: [0, 0, 0, 0] })
      } else {
        rows.push(this._generateRow())
      }
    }
    return rows
  },

  // 获取当前速度
  _getSpeed() {
    const score = this.data.score
    if (score >= 40) return 300
    if (score >= 30) return 350
    if (score >= 20) return 420
    if (score >= 10) return 500
    return 600
  },

  startGame() {
    const rows = this._initRows()
    this.setData({
      gameState: 'playing',
      score: 0,
      rows: rows,
      showEndModal: false,
      uploadResult: '',
    })
    this._startFalling()
  },

  _startFalling() {
    clearInterval(this._timer)
    this._timer = setInterval(() => {
      this._fallDown()
    }, this._getSpeed())
  },

  _fallDown() {
    let rows = this.data.rows.slice()
    // 检查最底行是否有未点击的黑块
    const bottomRow = rows[rows.length - 1]
    if (bottomRow.blocks.includes(1)) {
      // 有黑块未被点击，游戏结束
      this._gameOver()
      return
    }
    // 移除最底行，顶部添加新行
    rows.pop()
    rows.unshift(this._generateRow())
    this.setData({ rows })
  },

  onTileTap(e) {
    if (this.data.gameState !== 'playing') return

    // 获取点击位置
    const touch = e.touches[0]
    const query = wx.createSelectorQuery()
    query.select('.game-area').boundingClientRect((rect) => {
      if (!rect) return
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      const col = Math.floor(x / (rect.width / 4))
      const row = Math.floor(y / this._rowHeight)

      if (col < 0 || col > 3 || row < 0 || row >= this.data.rows.length) return

      const targetRow = this.data.rows[row]
      if (targetRow.blocks[col] === 1) {
        // 点击黑块 - 得分
        playNote(col)
        let rows = this.data.rows.slice()
        rows[row].blocks[col] = 0 // 移除黑块
        const newScore = this.data.score + 1
        this.setData({ score: newScore, rows })
        // 加速
        this._startFalling()
      } else {
        // 点击白块 - 游戏结束
        this._gameOver()
      }
    }).exec()
  },

  _gameOver() {
    clearInterval(this._timer)
    this._timer = null
    let bestScore = this.data.bestScore
    if (this.data.score > bestScore) {
      bestScore = this.data.score
      wx.setStorageSync('bestScore', bestScore)
    }
    this.setData({
      gameState: 'ended',
      bestScore: bestScore,
      showEndModal: true,
    })
  },

  uploadScore() {
    if (this.data.score <= 0) {
      wx.showToast({ title: '分数为0，无需上传', icon: 'none' })
      return
    }
    wx.showLoading({ title: '上传中...' })
    wx.cloud.callFunction({
      name: 'piano_uploadScore',
      data: { score: this.data.score },
    }).then((res) => {
      wx.hideLoading()
      const result = res.result
      if (result && result.success) {
        this.setData({ uploadResult: `上传成功！排名第${result.rank}` })
        wx.showToast({ title: '上传成功', icon: 'success' })
      } else {
        this.setData({ uploadResult: result ? result.message : '上传失败' })
        wx.showToast({ title: '上传失败', icon: 'none' })
      }
    }).catch(() => {
      wx.hideLoading()
      this.setData({ uploadResult: '上传失败' })
      wx.showToast({ title: '上传失败', icon: 'none' })
    })
  },

  restartGame() {
    this.setData({ showEndModal: false, uploadResult: '' })
    this.startGame()
  },

  goToRanking() {
    wx.navigateTo({ url: '/pages/ranking/index' })
  },

  onUnload() {
    clearInterval(this._timer)
  },
})
