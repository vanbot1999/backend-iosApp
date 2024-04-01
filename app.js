const express = require('express');
const app = express();
const port = 3000;

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/myBlogDb', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB...'))
.catch(err => console.error('Could not connect to MongoDB...', err));

const BlogPost = require('./models/BlogPost');

app.get('/api/blogs', async (req, res) => {
    const blogs = await BlogPost.find();
    res.send(blogs);
});


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

const cors = require('cors');
app.use(cors());