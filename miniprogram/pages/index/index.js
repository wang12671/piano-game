const { playNote, startBgm, stopBgm } = require('../../utils/audio')

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
  _visibleRows: 8, // 增加可见行数，确保黑块有充足下滑行程
  _totalRows: 10, // 总行数增加，黑块从顶部生成
  _currentSpeed: 800, // 初始速度平缓

  onLoad() {
    const bestScore = wx.getStorageSync('bestScore') || 0
    this.setData({ bestScore })
    const sysInfo = wx.getSystemInfoSync()
    this._rowHeight = Math.floor(sysInfo.windowHeight * 0.65 / this._visibleRows)
  },

  // 生成新行（1个黑块，位置随机）
  _generateRow() {
    const blocks = [0, 0, 0, 0]
    blocks[Math.floor(Math.random() * 4)] = 1
    return { blocks, hits: [false, false, false, false] }
  },

  // 初始化游戏行 - 黑块从顶部区域生成，拥有充足下滑行程
  _initRows() {
    const rows = []
    for (let i = 0; i < this._totalRows; i++) {
      // 最底部3行不生成黑块，预留充足可点击空间
      if (i >= this._totalRows - 3) {
        rows.push({ blocks: [0, 0, 0, 0], hits: [false, false, false, false] })
      } else {
        rows.push(this._generateRow())
      }
    }
    return rows
  },

  // 获取当前速度（毫秒）
  // 初始速度800ms（平缓），每10分速度减少40ms（线性加快），最低120ms
  _getSpeed(score) {
    const currentScore = score !== undefined ? score : this.data.score
    const newSpeed = 800 - Math.floor(currentScore / 10) * 40
    return Math.max(newSpeed, 120)
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
    startBgm()
    this._startFalling()
  },

  _startFalling() {
    clearInterval(this._timer)
    this._currentSpeed = this._getSpeed()
    // 简单定时器，黑块从顶部生成，直接下落
    this._timer = setInterval(() => {
      this._fallDown()
    }, this._currentSpeed)
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
      this._gameOver()
      return
    }
    // 移除最底行，顶部添加新行（黑块从顶部生成）
    rows.pop()
    rows.unshift(this._generateRow())
    this.setData({ rows })
  },

  onTileTap(e) {
    if (this.data.gameState !== 'playing') return

    const row = parseInt(e.currentTarget.dataset.row)
    const col = parseInt(e.currentTarget.dataset.col)

    if (col < 0 || col > 3 || row < 0 || row >= this.data.rows.length) return

    const targetRow = this.data.rows[row]
    if (targetRow.blocks[col] === 1) {
      // 点击黑块 - 即时得分，同步播放卡农音符
      playNote(col)
      let rows = this.data.rows.slice()
      // 即时触发金色粒子高光反馈（仅方块内部）
      rows[row].hits[col] = true
      rows[row].blocks[col] = 0
      const newScore = this.data.score + 1
      this.setData({ rows, score: newScore })
      // 120ms后清除粒子动画
      setTimeout(() => {
        rows[row].hits[col] = false
        this.setData({ rows })
      }, 120)
      this._updateSpeed(newScore)
    } else {
      this._gameOver()
    }
  },

  _gameOver() {
    clearInterval(this._timer)
    this._timer = null
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
    stopBgm()
  },
})
