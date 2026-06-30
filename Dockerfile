FROM node:18-alpine

WORKDIR /app

# 只复制运行需要的文件
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js index.html ./

ENV PORT=3001
EXPOSE 3001

CMD ["node", "server.js"]
