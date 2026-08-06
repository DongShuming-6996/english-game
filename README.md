# 大勇士小英语 · GitHub Pages 部署包

这个目录是「大勇士小英语」的线上部署包，采用与作品集站点相同的方式：
静态文件放在 `docs/`，GitHub Pages 从 `main` 分支的 `docs/` 目录发布。

## 一键部署（推荐）

需要一个 GitHub 个人令牌（classic PAT，勾选 `repo` 权限）：
https://github.com/settings/tokens

拿到令牌后（建议存成文件，避免出现在聊天记录里）：

```bash
python3 deploy-github.py /path/to/token.txt
# 或
GITHUB_TOKEN=<token> python3 deploy-github.py
```

脚本会自动：创建 `english-game` 仓库 → 上传 `docs/` 全部文件 → 开启 Pages → 打印站点地址。

## 手动部署

1. 在 https://github.com/new 创建公开仓库 `english-game`
2. 在本目录执行：
   ```bash
   git remote add origin https://github.com/DongShuming-6996/english-game.git
   git push -u origin main
   ```
3. 仓库 Settings → Pages → Source 选 `Deploy from a branch`，分支 `main`，目录 `/docs`，点 Save
4. 等待 1-3 分钟，访问 https://dongshuming-6996.github.io/english-game/

## 更新站点

重新构建/修改后，把新文件覆盖到 `docs/`，然后：

```bash
git add -A && git commit -m "update" && git push
```

Pages 会自动发布新版本（免费版一般 1-2 分钟生效）。

## 说明

- 站点是纯静态 + localStorage，所有数据存浏览器本地；教师模式发布的关卡可在本机导出/导入 JSON。
- 后续如需学生/老师数据云端同步，可接入 Supabase（作品集站点已用 Supabase，可复用账号体系思路）。
