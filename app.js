const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // 设置文件上传的目录
const app = express();
const port = 3000;
const path = require('path');

// 引入模型
const User = require('./models/user');
const BlogPost = require('./models/BlogPost');

// 配置
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // 配置静态文件服务

// MongoDB 连接
mongoose.connect('mongodb://localhost/myBlogDb', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB...'))
.catch(err => console.error('Could not connect to MongoDB...', err));

//注册
app.post('/api/register', async (req, res) => {
    try {
        // 检查用户名是否已经存在
        const existingUsername = await User.findOne({ username: req.body.username });
        if (existingUsername) {
            return res.status(409).send({ message: '用户名已经存在。' });
        }

        // 检查邮箱是否已经存在
        const existingEmail = await User.findOne({ email: req.body.email });
        if (existingEmail) {
            return res.status(409).send({ message: '邮箱已经被使用。' });
        }

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
            res.status(200).send({ token: token, username: user.username });
        } else {
            res.status(400).send('用户名或密码不正确');
        }
    } catch (error) {
        res.status(500).send('服务器错误: ' + error.message);
    }
});

app.post('/api/posts', upload.single('image'), async (req, res) => {
    try {
        let imageUrl = null;
        if (req.file) {
            imageUrl = req.file.path;
        }

        const post = new BlogPost({
            title: req.body.title,
            content: req.body.content,
            author: req.body.author,
            imageUrl: imageUrl,
            date: new Date()
        });

        const newPost = await post.save();
        res.status(201).send(newPost);
    } catch (error) {
        console.error('保存帖子时出错:', error);
        res.status(500).send('服务器错误: ' + error.message);
    }
});
// 删除帖子端点
app.delete('/api/posts/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;
        const deletedPost = await BlogPost.findByIdAndDelete(postId);
        if (deletedPost) {
            res.status(200).send({ message: '帖子删除成功' });
        } else {
            res.status(404).send({ message: '未找到要删除的帖子' });
        }
    } catch (error) {
        res.status(500).send('服务器错误: ' + error.message);
    }
});

// 修改：确保只有一个对 '/api/blogs' 的 GET 请求处理器
app.get('/api/blogs', async (req, res) => {
    try {
        const { excludeAuthor } = req.query;
        const query = excludeAuthor ? { author: { $ne: excludeAuthor } } : {};
        const blogs = await BlogPost.find(query);
        res.status(200).send(blogs);
    } catch (error) {
        res.status(500).send('服务器错误: ' + error.message);
    }
});

app.get('/api/posts/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const posts = await BlogPost.find({ author: username });
        res.status(200).send(posts);
    } catch (error) {
        res.status(500).send('服务器错误: ' + error.message);
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
