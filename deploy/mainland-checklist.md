# ACT IV 大陆可访问上线清单

## 不改变视觉设计

后续部署只涉及服务器、域名、Nginx、PM2、SSL、DNS 与备案配置，不修改 `src/` 中的视觉布局与样式。

## 必要条件

- 已购买中国大陆云服务器，例如阿里云 ECS、腾讯云 CVM、华为云 ECS
- `act4lab.com` 完成 ICP 备案
- 服务器开放 80、443 端口
- 域名 DNS 可以改到服务器公网 IP 或国内 CDN CNAME

## 推荐流程

1. 在大陆云厂商完成 `act4lab.com` ICP 备案。
2. 购买大陆服务器，推荐 2C2G 起步，系统 Ubuntu 22.04 LTS。
3. 安装 Node.js LTS、Nginx、PM2。
4. 上传当前项目目录到服务器。
5. 在服务器执行：

```bash
npm install
npm run build
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

6. 配置 Nginx：

```bash
sudo cp deploy/nginx-act4lab.conf /etc/nginx/conf.d/act4lab.conf
sudo nginx -t
sudo systemctl reload nginx
```

7. 配置 HTTPS 证书，可使用云厂商免费证书或 Certbot。
8. 将 DNS 切换到大陆服务器或国内 CDN。

## 后台入口

```text
https://act4lab.com/admin
```

生产环境请修改：

- `ADMIN_PASSWORD`
- `SESSION_SECRET`

## 必须备份

- `data/content.json`
- `uploads/`
