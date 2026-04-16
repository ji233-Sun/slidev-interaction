import type { LessonRuntimeHooks } from '@/app/types'

export const lesson02AgendaRuntime: LessonRuntimeHooks = {
  getFooterHint(context) {
    if (context.domSnapshot?.currentPage === 2) {
      return '已经切到第 2 页，继续检查标题和列表内容是否如预期渲染。'
    }

    return '新增第二页后，启动预览并按右方向键切到第 2 页，再回来查看 DOM 校验结果。'
  },
}
