<div align="center">

# ✨ Magic Resume Custom ✨

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![TanStack Start](https://img.shields.io/badge/TanStack_Start-latest-black)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-10.0-purple)

<a href="https://trendshift.io/repositories/13077" target="_blank"><img src="https://trendshift.io/api/badge/repositories/13077" alt="Magic Resume | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>


简体中文 | [English](./README.md)

</div>

Magic Resume Custom 是基于 Magic Resume 的个人定制版本。它是一个现代化的在线简历编辑器，基于 TanStack Start 和 Motion 构建，支持扫描件 PDF 智能导入、实时预览和自定义主题。

## 📸 项目截图

<img width="1920" height="1440" alt="85_1x_shots_so" src="https://github.com/user-attachments/assets/4667e49a-7bf2-4379-9390-725e42799dc7" />


## ✨ 特性

- 🚀 基于 TanStack Start 构建
- 💫 流畅的动画效果 (Motion)
- 🎨 自定义主题支持
- 🌙 深色模式
- 📤 导出为 PDF
- 🔄 实时预览
- 💾 自动保存
- 🔒 硬盘级存储
- 🧠 使用 DeepSeek Vision 识别扫描件、图片型 PDF（最多 3 页）
- 🖼️ 智能定位并提取简历证件照
- 📄 自动压缩为一页 A4 简历
- 🎨 预设色板和自定义主题色

## 🛠️ 技术栈

- TanStack Start
- TypeScript
- Motion
- Tiptap
- Tailwind CSS
- Zustand
- Shadcn/ui
- Lucide Icons

## 🚀 快速开始

运行环境：Node.js 20 或更高版本、pnpm 10。

1. 克隆项目

```bash
git clone https://github.com/ten10do/magic-resume-custom.git
cd magic-resume-custom
```

2. 启用 pnpm 并安装依赖

```bash
corepack enable
pnpm install
```

3. 启动开发服务器

```bash
pnpm dev
```

4. 打开浏览器访问 `http://localhost:3000`

## 🤖 AI 与 PDF 导入配置

普通简历编辑和 PDF 导出不需要 API Key。使用扫描件 PDF 智能导入时：

1. 打开应用中的“AI 服务商”。
2. 填写你自己的 DeepSeek API Key。
3. 返回“我的简历”，选择“导入简历 → 导入 PDF”。

API Key 保存在当前浏览器的本地存储中，不会提交到 GitHub。公开部署时应使用 HTTPS，并让每位使用者填写自己的 Key。

## 📦 生产环境运行

```bash
pnpm build
pnpm start
```

默认监听 `0.0.0.0:3000`。可以通过 `PORT` 和 `HOSTNAME` 环境变量修改。

## 🐳 Docker 部署

### Docker Compose

1. 确保你已经安装了 Docker 和 Docker Compose

2. 在项目根目录运行：

```bash
docker compose up -d
```

这将会：

- 自动构建应用镜像
- 在后台启动容器

## ☁️ 在线部署说明

- 推荐部署到支持 Node.js 或 Docker 的平台，因为 PDF 智能导入依赖服务端 API 路由。
- GitHub Pages 仅支持静态网站，不能直接运行完整功能。
- `.github/workflows/deploy.yml` 是可选的 Cloudflare 手动部署任务，需要配置 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`。
- `.github/workflows/docker-publish.yml` 是可选的 Docker Hub 手动发布任务，需要配置 `DOCKERHUB_USERNAME` 和 `DOCKERHUB_TOKEN`。



## 📝 开源协议与商业授权

本项目源代码基于 **Apache 2.0** 协议开源，但附带**严格的商业使用限制**：

- **个人免费**：仅限个人非商业目的（如个人学习交流、制作个人简历）免费使用。
- **商用需授权**：严禁未经授权的商业化使用。任何组织或个人，若将其作为服务（SaaS/PaaS等）向公众提供以获取利益，或作为企业商业运营使用，或进行二次商业化开发，**无论是否修改源代码，均须获取商业授权**。

详情请查看 [LICENSE](LICENSE) 文件。

## 🗺️ 路线图

- [x] AI 辅助编写
- [x] 多语言支持
- [ ] 支持更多简历模板
- [ ] 更多格式导出
- [x] 自定义模型
- [x] 自动一页纸
- [x] 导入扫描件和图片型 PDF
- [ ] 在线简历托管

## 📈 Star History

<a href="https://star-history.com/#JOYCEQL/magic-resume&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=JOYCEQL/magic-resume&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=JOYCEQL/magic-resume&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=JOYCEQL/magic-resume&type=Date" />
 </picture>
</a>

## 📞 联系方式

可以通过以下方式关注最新动态:

- 作者：SiYue
- X: @GuangzhouY81070
- Discord: 欢迎加入群组 https://discord.gg/9mWgZrW3VN
- 邮箱：18806723365@163.com
  

- 项目主页：https://github.com/JOYCEQL/magic-resume

## 🌟 支持项目

<img src="https://github.com/JOYCEQL/picx-images-hosting/raw/master/pintu-fulicat.com-1741081632544.26lmg2uc2m.webp" width="320"  alt="图片描述">

## ❤️ 赞助名单

<div align="center">
  <h3>Sponsors</h3>
  <p>如果您赞助了本项目，但没展示在这里，请联系我。</p>
  <p>
    <a href="https://github.com/yj147">
      <img src="https://github.com/yj147.png?size=40" width="40" height="40" alt="@yj147" />
    </a>
    <a href="https://github.com/someone1128">
      <img src="https://github.com/someone1128.png?size=40" width="40" height="40" alt="@someone1128" />
    </a>
    <!-- 在这里继续添加赞助者：
    <a href="https://github.com/<username>">
      <img src="https://github.com/<username>.png?size=40" width="40" height="40" alt="@<username>" />
    </a>
    -->
  </p>
</div>
