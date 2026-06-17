Page({
  data: {
    rankList: [],
    loading: true,
  },

  onLoad() {
    this.loadRankList();
  },

  loadRankList() {
    this.setData({ loading: true });
    wx.cloud.callFunction({
      name: 'piano_getRankList',
      data: { limit: 10 },
    }).then((res) => {
      const result = res.result;
      if (result && result.success) {
        this.setData({ rankList: result.data, loading: false });
      } else {
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      }
    }).catch(() => {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
