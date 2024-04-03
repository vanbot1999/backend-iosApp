const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: String,
        required: true
    },
    imageUrl: String, // 如果图片是可选的
    date: {
        type: Date,
        default: Date.now // 设置默认值为当前时间
    }
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;
