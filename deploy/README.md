# 部署说明

站点是纯静态的，**线上不需要 Node 常驻进程**。`site/server.js` 只用于本地预览，线上由 nginx 直接托管 `site/` 目录。

## 一、本地预览

```bash
node scripts/build-content.mjs     # docs/*.md -> site/assets/content.js
node site/server.js                # http://127.0.0.1:8899
```

改完 `docs/` 里的 Markdown 后必须重新跑一次 `build-content.mjs`，否则页面还是旧内容。

## 二、线上部署

前置：本机可访问 `123.207.11.185:22`，工作区 `node_modules` 里有 `ssh2`。

```bash
# 1. 先构建
node scripts/build-content.mjs

# 2. 上传 + 写 nginx 配置 + reload（幂等，可反复执行）
SRV_PASS='<服务器 ubuntu 口令>' node deploy/deploy-remote.cjs
```

脚本做四件事：

1. `sudo mkdir -p /opt/agent-offer/site/assets` 并改属主为 `ubuntu`
2. 上传 4 个静态文件 + nginx 配置
3. `sudo cp` 到 `/etc/nginx/sites-enabled/agent.meetoffer.cn.conf`，`nginx -t` 通过后 reload
4. `curl -H "Host: agent.meetoffer.cn" https://127.0.0.1/` 自检，期望 `https:200 http:301`

## 三、DNS（必须做，否则域名打不开）

在 DNSPod（`meetoffer.cn`）添加一条记录：

| 主机记录 | 类型 | 线路 | 记录值 | TTL |
|---|---|---|---|---|
| `agent` | A | 默认 | `123.207.11.185` | 600 |

生效后用 `nslookup agent.meetoffer.cn` 验证，或直接访问 `https://agent.meetoffer.cn`。

> 证书复用 `*.meetoffer.cn` 通配证书（`/opt/buddy-gateway/ssl/fullchain.pem`），**不需要为新子域单独申请**，只要 DNS 指向本机即可。

## 四、服务器上的路径

| 用途 | 路径 |
|---|---|
| 站点根目录 | `/opt/agent-offer/site` |
| nginx 配置 | `/etc/nginx/sites-enabled/agent.meetoffer.cn.conf` |
| 证书 | `/opt/buddy-gateway/ssl/fullchain.pem` · `privkey.pem` |
| 日志 | `/var/log/nginx/access.log` · `error.log` |

## 五、更新与回滚

- **只改内容**：改 `docs/` → `build-content.mjs` → `deploy-remote.cjs`
- **回滚**：`deploy/` 目录在 git 里，检出上一版配置重新执行部署脚本即可；站点本身无数据库、无状态，回滚零风险
- **临时下线**：`sudo rm /etc/nginx/sites-enabled/agent.meetoffer.cn.conf && sudo systemctl reload nginx`

## 六、缓存策略

- `index.html`：`no-cache`，内容更新立刻生效
- `/assets/*`：`7d` 长缓存（文件名不含 hash，更新后用户强刷即可）
- gzip 开启，`text/css` / `application/javascript` / `application/json` / `svg` 均压缩

## 七、上线后要验证的四件事

1. `https://agent.meetoffer.cn` 打开正常，控制台无报错
2. 左侧目录任意点三篇，路由与返回正常
3. `Ctrl+K` 搜索能出结果
4. 手机宽访问，侧栏变抽屉、正文不横向溢出
