# 使用官方的node作为父镜像  
FROM node:20

# # 设置工作目录  
# WORKDIR /app  

# 复制package*.json和yarn.lock（或者package-lock.json）  
COPY package*.json ./  

# 安装项目依赖  
RUN npm install --frozen-lockfile  

# 复制项目源代码  
COPY . .  

# 构建应用  
RUN npm run build

# 使用nginx作为静态文件服务器  
FROM nginx
# 作者信息
LABEL maintainer="975115611@qq.com"

# 复制nginx配置文件  
COPY dist  /usr/share/nginx/html  

# 复制nginx配置文件（如果需要自定义）  
COPY nginx.conf /etc/nginx/conf.d/default.conf  

# 如果你需要自定义nginx配置，可以在项目根目录下创建一个nginx.conf文件  
# 并取消上面一行的注释，将nginx.conf复制到nginx配置目录  

# 暴露端口  
EXPOSE 80  

# 运行nginx  
CMD ["nginx", "-g", "daemon off;"]