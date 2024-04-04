const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 3000;

// 设置文件上传的目录
const upload = multer({ dest: 'uploads/' });

// 引入模型
const User = require('./models/user');
const Post = require('./models/Post');

// 配置
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB 连接
mongoose.connect('mongodb://localhost/myBlogDb', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB...'))
.catch(err => console.error('Could not connect to MongoDB...', err));

// 用户注册
app.post('/api/register', async (req, res) => {
    try {
        const existingUsername = await User.findOne({ username: req.body.username });
        if (existingUsername) {
            return res.status(409).send({ message: '用户名已经存在。' });
        }

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

// 用户登录
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

// 创建新帖子
app.post('/api/posts', upload.single('image'), async (req, res) => {
    try {
        const post = new Post({
            title: req.body.title,
            content: req.body.content,
            author: req.body.author,
            imageUrl: req.file ? req.file.path : undefined  // 使用上传的文件路径
        });

        const newPost = await post.save();
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ message: '创建帖子时出错', error: error.message });
    }
});


// 删除帖子
app.delete('/api/posts/:postId', async (req, res) => {
    try {
        const postId = req.params.postId;
        const deletedPost = await Post.findByIdAndDelete(postId);
        if (deletedPost) {
            res.status(200).send({ message: '帖子删除成功' });
        } else {
            res.status(404).send({ message: '未找到要删除的帖子' });
        }
    } catch (error) {
        res.status(500).send('服务器错误: ' + error.message);
    }
});

// 获取所有帖子
app.get('/api/posts', async (req, res) => {
    console.log("收到请求，查询参数：", req.query);
    const excludeAuthor = req.query.excludeAuthor;
    let query = {};
    if (excludeAuthor) {
        query.author = { $ne: excludeAuthor }; // $ne 表示不等于
    }

    try {
        const posts = await Post.find(query);
        res.status(200).send(posts);
    } catch (error) {
        res.status(500).send('服务器错误: ' + error.message);
    }
});

// 获取指定作者的帖子
app.get('/api/posts/author/:username', async (req, res) => {
    try {
        const username = req.params.username;
        const posts = await Post.find({ author: username });
        res.status(200).send(posts);
    } catch (error) {
        res.status(500).send('服务器错误: ' + error.message);
    }
});

// 引入评论模型
const Comment = require('./models/Comment');

// 创建评论
app.post('/api/posts/:postId/comments', async (req, res) => {
    console.log("Received comment data:", req.body);
    try {
        const comment = new Comment({
            content: req.body.content,
            author: req.body.author,
            postId: req.params.postId
        });

        const newComment = await comment.save();
        console.log("Comment saved:", newComment);
        res.status(201).json(newComment);
    } catch (error) {
        console.error("Error creating comment:", error);
        res.status(500).json({ message: '创建评论时出错', error: error.message });
    }
});


// 获取一个帖子的所有评论
app.get('/api/posts/:postId/comments', async (req, res) => {
    try {
        const postId = req.params.postId;
        const comments = await Comment.find({ postId: postId });
        res.status(200).json(comments);
    } catch (error) {
        res.status(500).json({ message: '获取评论时出错', error: error.message });
    }
});

// 获取帖子内全部内容
app.get('/api/posts/:postId/details', async (req, res) => {
    try {
        const postId = req.params.postId;
        console.log(`Fetching details for post with ID: ${postId}`);  // Log the postId being queried

        const post = await Post.findById(postId);
        if (!post) {
            console.log('Post not found with ID:', postId);  // Log if the post is not found
            return res.status(404).send({ message: '未找到帖子' });
        }

        const comments = await Comment.find({ postId: postId });
        console.log(`Found ${comments.length} comments for post ID: ${postId}`);  // Log the number of comments found

        res.status(200).json({ ...post.toObject(), comments });
    } catch (error) {
        console.error('Error fetching post details:', error);  // Log any errors that occur
        res.status(500).send('服务器错误: ' + error.message);
    }
});


// 启动服务器
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
