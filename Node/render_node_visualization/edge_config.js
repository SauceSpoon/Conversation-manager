// 连线样式配置：全局默认 + 单条覆盖
// 以后切换主题/高亮路径都改这里
export const defaultEdgeStyle = {
  color: '#999',           // 线条颜色
  lineWidth: 1.5,          // 线宽
  curveType: 'bezier',     // 曲线类型：'bezier' | 'line' | 'arc'
  arrowSize: 8,            // 箭头大小（0 = 无箭头）
  arrowColor: '#999',      // 箭头颜色
  dash: null,              // 虚线模式：null = 实线，[5,5] = 虚线
  opacity: 1,              // 透明度 0~1
  highlightColor: '#1976d2'// 高亮时的颜色
};
