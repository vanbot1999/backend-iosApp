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

// 用户注册 (/api/register)
// 当用户填写注册表单并提交时，服务器会检查用户名和邮箱是否已经被使用。
// 如果用户名或邮箱未被使用，服务器会对用户密码进行加密后存储，然后创建新用户。
// 如果成功创建用户，服务器会返回201状态码和注册成功的消息。
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

// 用户登录 (/api/login)
// 用户提交用户名和密码进行登录。
// 服务器检查提交的用户名是否存在，如果存在，服务器会比较提交的密码和数据库中的加密密码。
// 如果用户名和密码匹配，服务器会生成一个JWT令牌返回给客户端，令牌中包含用户ID。
// 如果用户名或密码不正确，服务器会返回错误消息。
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

// 创建新帖子 (/api/posts)
// 用户可以创建新帖子，必须提供标题、内容和作者，还可以选择上传一张图片。
// 如果帖子创建成功，服务器会将其保存到数据库，并返回201状态码和帖子数据。
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


// 删除帖子 (/api/posts/:postId)
// 用户可以通过帖子ID删除特定的帖子。
// 如果找到并成功删除帖子，服务器会返回成功消息，否则返回未找到帖子的错误消息。
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

// 获取所有帖子 (/api/posts)
// 用户可以查询所有帖子。可以选择排除某个作者的帖子。
// 服务器会根据查询参数返回相应的帖子列表。
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

// 获取指定作者的帖子 (/api/posts/author/:username)
// 用户可以根据作者用户名查询该作者的所有帖子。
// 服务器会返回匹配作者的所有帖子。
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

// 创建评论 (/api/posts/:postId/comments)
// 用户可以为特定的帖子添加评论。必须提供内容和作者。
// 如果评论创建成功，服务器会将其保存到数据库，并返回评论数据。
// 修改创建评论的端点以允许指定父评论
app.post('/api/posts/:postId/comments', async (req, res) => {
    try {
        const comment = new Comment({
            content: req.body.content,
            author: req.body.author,
            postId: req.params.postId,
            parentCommentId: req.body.parentCommentId || null
        });

        const newComment = await comment.save();
        res.status(201).json(newComment);
    } catch (error) {
        res.status(500).json({ message: '创建评论时出错', error: error.message });
    }
});

// 删除评论 (/api/posts/:postId/comments/:commentId)
// 用户可以通过评论ID删除特定的评论。
// 如果找到并成功删除评论，服务器会返回成功消息，否则返回未找到评论的错误消息。
app.delete('/api/posts/:postId/comments/:commentId', async (req, res) => {
    try {
        const { postId, commentId } = req.params;

        const deletedComment = await Comment.findByIdAndDelete(commentId);
        if (deletedComment) {
            res.status(200).send({ message: '评论删除成功' });
        } else {
            res.status(404).send({ message: '未找到要删除的评论' });
        }
    } catch (error) {
        res.status(500).send('服务器错误: ' + error.message);
    }
});

// 获取一个帖子的所有评论 (/api/posts/:postId/comments)
// 用户可以查询特定帖子的所有评论。
// 服务器会返回该帖子的所有评论。
app.get('/api/posts/:postId/comments', async (req, res) => {
    try {
        const postId = req.params.postId;
        const comments = await Comment.find({ postId: postId });
        res.status(200).json(comments);
    } catch (error) {
        res.status(500).json({ message: '获取评论时出错', error: error.message });
    }
});

// 获取帖子内全部内容 (/api/posts/:postId/details)
// 用户可以通过帖子ID获取帖子的详细内容及其所有评论。
// 如果帖子存在，服务器会返回帖子的所有数据和评论，否则返回未找到帖子的错误消息。
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
