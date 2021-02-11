import os.path
from flask import Flask, render_template, send_from_directory, request
import src.query as query

app = Flask(__name__)
data_folder = os.path.join(app.root_path, 'data')


@app.route("/")
def index():
    return render_template("main.html")

@app.route("/data/<path:filename>/")
def data(filename):
    # query.dag_data()
    try:
        return send_from_directory(data_folder, filename)
    except FileNotFoundError:
        abort(404)

@app.route('/func/', methods=['POST'])
def form_post():

    if(query.test_query(request.get_json()) == 404):
        print("User or repository doesn't exist")
        return("",404)

    if (query.rate_limit_test()) < 0:
        print("Rate limited")
        return("", 403)

    query.loads_data(request.get_json())

    return ('', 204)

if __name__ == "__main__": 
        app.run() 