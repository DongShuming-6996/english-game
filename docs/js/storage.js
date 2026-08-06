// ===== 数据存储层 =====
// 说明：MVP 阶段把每个人的学习数据存在手机本地（localStorage）。
// 以后接入线上后端/数据库时，只需要改这个文件，把 get/set 换成云端接口，
// 其余页面代码不用动。

const Store = {
  key(uid, name) {
    return 'dyx-' + uid + '-' + name;
  },
  get(uid, name, def) {
    try {
      const v = localStorage.getItem(this.key(uid, name));
      return v === null ? def : JSON.parse(v);
    } catch (e) {
      return def;
    }
  },
  set(uid, name, val) {
    localStorage.setItem(this.key(uid, name), JSON.stringify(val));
  },
  remove(uid, name) {
    localStorage.removeItem(this.key(uid, name));
  }
};