import os.path
from flask import Flask, render_template, send_from_directory, request
import src.query as query

app = Flask(__name__)
assets_folder = os.path.join(app.root_path, 'data')
print(assets_folder)

@app.route("/")
def index():
    return render_template("main.html")

@app.route("/data/<path:filename>/")
def data(filename):
    # query.dag_data()
    try:
        return send_from_directory(assets_folder, filename)
    except FileNotFoundError:
        abort(404)

@app.route('/func/', methods=['POST'])
def my_form_post():
    user_query = request.get_json()['name_and_repo']
    query.loads_data(user_query)

    return ('', 204)
    
