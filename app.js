//app.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // 设置文件上传的目录
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://localhost/myBlogDb', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB...'))
.catch(err => console.error('Could not connect to MongoDB...', err));

const User = require('./models/user');
const BlogPost = require('./models/BlogPost');

app.post('/api/register', async (req, res) => {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      const user = new User({
        username: req.body.username,
        email: req.body.email,
        password: hashedPassword
      });
      const newUser = await user.save();
      res.status(201).send({ message: '用户注册成功', userId: newUser._id });
    } catch (error) {
      res.status(500).send('服务器错误: ' + error.message);
    }
  });
  
  app.post('/api/login', async (req, res) => {
    try {
      const user = await User.findOne({ username: req.body.username });
      if (user && await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ userId: user._id }, 'yourSecretKey', { expiresIn: '24h' });
        // 在响应中返回用户名和令牌
        res.status(200).send({ token: token, username: user.username });
      } else {
        res.status(400).send('用户名或密码不正确');
      }
    } catch (error) {
      res.status(500).send('服务器错误: ' + error.message);
    }
  });
  
  // 发帖的路由处理
app.post('/api/posts', upload.single('image'), async (req, res) => {
    try {
        // 如果请求中包含文件，`req.file` 将包含有关文件的信息
        // `req.body` 将包含文本字段，比如 `title` 和 `content`
        let imageUrl = null;
        if (req.file) {
            imageUrl = req.file.path; // 使用上传文件的路径作为图片URL
        }

        const post = new BlogPost({
            title: req.body.title,
            content: req.body.content,
            author: req.body.author, // 实际项目中应从认证用户信息获取
            imageUrl: imageUrl, // 图片路径
            date: new Date() // 使用 date 而不是 publishDate
        });        

        const newPost = await post.save(); // 保存帖子到数据库
        res.status(201).send(newPost); // 返回创建的帖子
    } catch (error) {
        console.error('保存帖子时出错:', error);
        res.status(500).send('服务器错误: ' + error.message);
    }
});

  app.get('/api/blogs', async (req, res) => {
    try {
      const blogs = await BlogPost.find();
      res.status(200).send(blogs);
    } catch (error) {
      res.status(500).send('服务器错误: ' + error.message);
    }
  });
  
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
