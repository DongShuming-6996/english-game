#!/usr/bin/env python3
"""一键部署「大勇士小英语」到 GitHub Pages（走 api.github.com，无需 gh/git 联网）。

用法:
  GITHUB_TOKEN=<token> python3 deploy-github.py
  或
  python3 deploy-github.py /path/to/token-file.txt

流程: 创建仓库(如不存在) → 通过 Git Data API 上传 docs/ → 开启 Pages(branch=main, path=/docs)。
令牌只保存在内存中，不会打印、不会写入磁盘。
"""
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

OWNER = "DongShuming-6996"
REPO = "english-game"
BRANCH = "main"
PAGES_PATH = "/docs"
API = "https://api.github.com"
SITE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")


def get_token():
    tok = os.environ.get("GITHUB_TOKEN")
    if tok:
        return tok.strip()
    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8") as f:
            tok = f.read().strip()
        if tok:
            return tok
    sys.exit("请提供 GitHub 令牌：GITHUB_TOKEN=<token> python3 deploy-github.py，或 python3 deploy-github.py token文件路径")


def api(method, url, token, body=None, expect=(200, 201, 204, 404)):
    req = urllib.request.Request(url, method=method, headers={
        "Authorization": "Bearer " + token,
        "Accept": "application/vnd.github+json",
        "User-Agent": "codex-deploy",
    })
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data, timeout=30) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"message": raw.decode("utf-8", "replace")[:300]}


def ensure_repo(token):
    code, data = api("GET", f"{API}/repos/{OWNER}/{REPO}", token)
    if code == 200:
        print(f"仓库已存在: {data['html_url']}")
        return
    code, data = api("POST", f"{API}/user/repos", token, {
        "name": REPO,
        "description": "大勇士小英语 · 小学生英语闯关游戏（听一听/跟读/排一排/记一记）",
        "private": False,
        "auto_init": False,
        "has_issues": True,
        "has_wiki": False,
    })
    if code in (200, 201):
        print(f"仓库创建成功: {data.get('html_url')}")
    else:
        sys.exit(f"创建仓库失败: {code} {data.get('message')}")


def walk_files():
    for root, _dirs, files in os.walk(SITE_DIR):
        for name in sorted(files):
            full = os.path.join(root, name)
            rel = os.path.relpath(full, os.path.dirname(SITE_DIR))  # docs/xxx
            yield rel, full


def upload(token):
    entries = []
    for rel, full in walk_files():
        with open(full, "rb") as f:
            content = base64.b64encode(f.read()).decode()
        code, data = api("POST", f"{API}/repos/{OWNER}/{REPO}/git/blobs", token,
                         {"content": content, "encoding": "base64"})
        if code not in (200, 201):
            sys.exit(f"上传 {rel} 失败: {code} {data.get('message')}")
        entries.append({"path": rel, "mode": "100644", "type": "blob", "sha": data["sha"]})
        print(f"  ✓ {rel}")

    code, data = api("POST", f"{API}/repos/{OWNER}/{REPO}/git/trees", token, {"tree": entries})
    if code not in (200, 201):
        sys.exit(f"创建 tree 失败: {code} {data.get('message')}")
    tree_sha = data["sha"]

    code, head = api("GET", f"{API}/repos/{OWNER}/{REPO}/git/ref/heads/{BRANCH}", token)
    parents = [head["object"]["sha"]] if code == 200 else []
    commit_body = {
        "message": "deploy: 大勇士小英语 静态站点",
        "tree": tree_sha,
        "parents": parents,
    }
    code, data = api("POST", f"{API}/repos/{OWNER}/{REPO}/git/commits", token, commit_body)
    if code not in (200, 201):
        sys.exit(f"创建 commit 失败: {code} {data.get('message')}")
    commit_sha = data["sha"]

    if parents:
        code, data = api("PATCH", f"{API}/repos/{OWNER}/{REPO}/git/refs/heads/{BRANCH}", token,
                         {"sha": commit_sha, "force": True})
    else:
        code, data = api("POST", f"{API}/repos/{OWNER}/{REPO}/git/refs", token,
                         {"ref": f"refs/heads/{BRANCH}", "sha": commit_sha})
    if code not in (200, 201):
        sys.exit(f"更新分支失败: {code} {data.get('message')}")
    print(f"分支 {BRANCH} 已更新: {commit_sha[:8]}")


def enable_pages(token):
    code, data = api("POST", f"{API}/repos/{OWNER}/{REPO}/pages", token, {
        "build_type": "legacy",
        "source": {"branch": BRANCH, "path": PAGES_PATH},
    })
    if code in (200, 201):
        print("GitHub Pages 已开启（legacy 模式，branch=main, path=/docs）")
        return
    if code == 409:
        print("Pages 已开启过，尝试更新配置…")
        code, data = api("PUT", f"{API}/repos/{OWNER}/{REPO}/pages", token, {
            "build_type": "legacy",
            "source": {"branch": BRANCH, "path": PAGES_PATH},
        })
        if code not in (200, 201, 204):
            print(f"注意：Pages 配置更新返回 {code} {data.get('message')}")
        return
    if code == 404:
        sys.exit("无法开启 Pages（请确认令牌有 repo 权限且仓库已创建）")
    print(f"注意：开启 Pages 返回 {code} {data.get('message')}（可能是首次部署需要几分钟）")


def main():
    token = get_token()
    # 校验令牌
    code, data = api("GET", f"{API}/user", token)
    if code != 200:
        sys.exit(f"令牌无效: {code} {data.get('message')}")
    print("令牌有效，登录账号:", data.get("login"))
    ensure_repo(token)
    print("上传站点文件…")
    upload(token)
    enable_pages(token)
    print()
    print("完成！站点地址:")
    print(f"  https://{OWNER}.github.io/{REPO}/")
    print("首次启用 Pages 后，通常 1-3 分钟生效。")


if __name__ == "__main__":
    main()
