# ACT IV 中国大陆可访问部署方案

## 结论

当前 `act4lab.com` 部署在 Cloudflare Pages。Cloudflare 普通网络在中国大陆访问不稳定，无法承诺“无需代理、随时访问”。

要满足中国大陆 IP 长期稳定访问，推荐迁移到以下二选一架构：

1. **大陆稳定方案**：阿里云 / 腾讯云中国大陆服务器 + ICP 备案 + 国内 CDN。
2. **快速折中方案**：腾讯云 / 阿里云香港服务器，不需要 ICP 备案，但大陆访问稳定性仍受跨境链路影响。

如果要求“随时访问”，应选择第 1 种。

## 推荐生产架构

- 域名：`act4lab.com`
- 应用：当前 Node.js + React 全栈版本
- 服务器：腾讯云 CVM 或阿里云 ECS，地域选择中国大陆
- 备案：为 `act4lab.com` 完成 ICP 备案
- CDN：腾讯云 EdgeOne / CDN 或阿里云 CDN
- 反向代理：Nginx
- 进程守护：PM2
- 数据目录：`data/`
- 上传目录：`uploads/`

## 服务器部署命令

```bash
git clone <your-repo-url> act4lab
cd act4lab
npm install
npm run build
npm install -g pm2
ADMIN_USER=admin ADMIN_PASSWORD='替换成强密码' SESSION_SECRET='替换成长随机字符串' pm2 start server.js --name act4lab
pm2 save
```

## Nginx 示例

```nginx
server {
    listen 80;
    server_name act4lab.com www.act4lab.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

配置 HTTPS 后，将 80 自动跳转到 443。

## DNS 切换

当大陆服务器准备好后，把 Cloudflare 里的 `act4lab.com` 记录改为：

- `A @ 你的服务器公网 IP`
- `A www 你的服务器公网 IP`

如果接入国内 CDN，则按 CDN 控制台提供的 CNAME 修改。

## 后台管理

地址：

```text
https://act4lab.com/admin
```

默认开发账号：

```text
用户名：admin
密码：Act4lab@2026
```

生产环境必须通过环境变量替换默认密码。

后台支持：

- 登录 / 退出
- 修改基础联系信息
- 修改新闻卡片
- 修改作品标题、说明、编号
- 上传作品图片
- 保存后前台刷新立即生效

需要持久化备份：

- `data/content.json`
- `uploads/`
