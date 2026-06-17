const { playNote, startBgm, stopBgm } = require('../../utils/audio')

Page({
  data: {
    gameState: 'idle',
    score: 0,
    bestScore: 0,
    rows: [],
    showEndModal: false,
    uploadResult: '',
    offsetY: 0, // 用于平滑动画
  },

  _timer: null,
  _animationTimer: null,
  _rowHeight: 0,
  _visibleRows: 6,
  _totalRows: 7,
  _currentSpeed: 600,
  _animationInterval: 16, // 约60fps的动画帧率

  onLoad() {
    const bestScore = wx.getStorageSync('bestScore') || 0
    this.setData({ bestScore })
    // 获取屏幕信息计算行高
    const sysInfo = wx.getSystemInfoSync()
    // 游戏区域高度约为屏幕高度的70%
    this._rowHeight = Math.floor(sysInfo.windowHeight * 0.7 / this._visibleRows)
    this._gameAreaHeight = Math.floor(sysInfo.windowHeight * 0.7)
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

  // 获取当前速度（毫秒）
  _getSpeed(score) {
    const currentScore = score !== undefined ? score : this.data.score
    if (currentScore >= 40) return 250
    if (currentScore >= 30) return 300
    if (currentScore >= 20) return 350
    if (currentScore >= 10) return 400
    return 500
  },

  startGame() {
    const rows = this._initRows()
    this.setData({
      gameState: 'playing',
      score: 0,
      rows: rows,
      showEndModal: false,
      uploadResult: '',
      offsetY: 0,
    })
    // 启动卡农背景音乐
    startBgm()
    this._startFalling()
  },

  _startFalling() {
    clearInterval(this._timer)
    clearInterval(this._animationTimer)
    
    this._currentSpeed = this._getSpeed()
    
    // 使用更短的动画帧来实现平滑流动
    const stepsPerRow = 10 // 每行分成10步动画
    const stepInterval = this._currentSpeed / stepsPerRow
    const stepOffset = this._rowHeight / stepsPerRow
    
    let currentStep = 0
    
    this._animationTimer = setInterval(() => {
      // 更新偏移量实现平滑动画
      this.setData({ offsetY: this.data.offsetY + stepOffset })
      currentStep++
      
      if (currentStep >= stepsPerRow) {
        // 完成一行下落
        currentStep = 0
        this.setData({ offsetY: 0 })
        this._fallDown()
      }
    }, stepInterval)
  },

  _updateSpeed(score) {
    const newSpeed = this._getSpeed(score)
    if (newSpeed !== this._currentSpeed) {
      this._currentSpeed = newSpeed
      this._startFalling()
    }
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

    // 直接从事件参数获取行列信息，避免异步DOM查询
    const row = parseInt(e.currentTarget.dataset.row)
    const col = parseInt(e.currentTarget.dataset.col)

    if (col < 0 || col > 3 || row < 0 || row >= this.data.rows.length) return

    const targetRow = this.data.rows[row]
    if (targetRow.blocks[col] === 1) {
      // 点击黑块 - 得分
      playNote(col)
      let rows = this.data.rows.slice()
      rows[row].blocks[col] = 0 // 移除黑块
      const newScore = this.data.score + 1
      this.setData({ score: newScore, rows })
      // 加速 - 只有速度变化时才重建定时器
      this._updateSpeed(newScore)
    } else {
      // 点击白块 - 游戏结束
      this._gameOver()
    }
  },

  _gameOver() {
    clearInterval(this._animationTimer)
    this._animationTimer = null
    clearInterval(this._timer)
    this._timer = null
    // 停止背景音乐
    stopBgm()
    let bestScore = this.data.bestScore
    if (this.data.score > bestScore) {
      bestScore = this.data.score
      wx.setStorageSync('bestScore', bestScore)
    }
    this.setData({
      gameState: 'ended',
      bestScore: bestScore,
      showEndModal: true,
      offsetY: 0,
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
    clearInterval(this._animationTimer)
    clearInterval(this._timer)
    stopBgm()
  },
})
