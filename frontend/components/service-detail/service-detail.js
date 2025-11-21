// components/service-detail/service-detail.js
Component({
  data: {
    isVisible: false
  },
  methods: {
    show() {
      this.setData({ isVisible: true });
    },
    hide() {
      this.setData({ isVisible: false });
    }
  }
});