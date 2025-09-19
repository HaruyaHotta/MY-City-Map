from flask import Flask
from flask import g,render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_required, login_user
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime
import os
import pytz
from flask_migrate import Migrate

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"]= "sqlite:///blog.db"
app.config['SECRET_KEY'] = os.urandom(24)
db = SQLAlchemy(app)

migrate = Migrate(app, db)

class Post(db.Model):
    id = db.Column(db.Integer,primary_key = True)
    title = db.Column(db.String(50),nullable = False)
    comment = db.Column(db.String(300),nullable = False)
    category = db.Column(db.String(50),nullable = True)
    created_at = db.Column(db.DateTime,nullable = False, default = datetime.now(pytz.timezone('Asia/Tokyo')))
    latitude = db.Column(db.Float,nullable = True)
    longitude = db.Column(db.Float,nullable = True)

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(30), nullable = False , unique = True)
    password = db.Column(db.String(12))

login_manager = LoginManager()
login_manager.login_view = "login"
login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.context_processor
def inject_global_variables():
    return dict(
        api_key=os.environ.get('GOOGLE_API_KEY'),
        app_name="My Awesome App"
    )

@app.route('/')
@login_required
def index():
    return render_template('index.html',)

@app.route('/signup', methods = ['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        user = User(username = username, password = generate_password_hash(password, method = 'pbkdf2:sha256'))

        db.session.add(user)
        db.session.commit()
        return redirect('/login')
    else:
        return render_template('signup.html')


@app.route('/login',methods = ['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        user = User.query.filter_by(username = username).first()
        if check_password_hash(user.password, password):
            login_user(user)
            return redirect('/')
    else:
        return render_template('login.html',)


@app.route('/api/posts', methods = ['GET', 'POST'])
def handle_posts():
    if request.method == 'POST':
        data = request.json
        title = data.get('title')
        comment = data.get('comment')
        category = data.get('category')
        latitude = data.get('latitude')
        longitude = data.get('longitude')

        if  title and comment and latitude is not None and longitude is not None:
            new_post = Post(title=title, comment=comment,category=category, latitude=latitude, longitude=longitude)
            db.session.add(new_post)
            db.session.commit()
            return jsonify({'message': '投稿が完了しました！'}), 201
        
        return jsonify({'error': '無効なデータです'}), 400

    elif request.method == 'GET':
        posts = Post.query.all()
        posts_list = [{
            'id': post.id,
            'title': post.title,
            'comment': post.comment,
            'category': post.category,
            'latitude': post.latitude,
            'longitude': post.longitude
        } for post in posts]
        return jsonify({'posts': posts_list})
    
@app.route('/api/posts/<int:post_id>', methods = ['DELETE'])
def delete_post(post_id):
    post = Post.query.get(post_id)
    if post:
        db.session.delete(post)
        db.session.commit()
        return jsonify({'message': '投稿が削除されました'}),200
    return jsonify({'error':'投稿が見つかりませんでした'}),400

@app.route('/api/posts/<int:post_id>',methods = ['PUT'])
def update_post(post_id):
    post = Post.query.get(post_id)
    if not post:
        return jsonify({'error':'投稿が見つかりませんでした'}),404
    
    data = request.json
    title =data.get('title')
    comment = data.get('comment')
    category = data.get('category')

    if title and comment and category:
        post.title = title
        post.comment = comment
        post.category = category
        db.session.commit()
        return jsonify({'message':'投稿が更新されました'}),200
    
    return jsonify({'error':'無効なデータです'}),400

