import requests
import sys
import json

def query(username):
    headers = {}
    url = 'https://api.github.com/users/' + username+ '/repos'
    r = requests.get(url, headers=headers,  auth=('bendunnegyms', '2c6b7ed1bd7ab86dc1bf7ae5e3622415f5c252ac'))
    print(json.dumps(json.loads(r.text), indent= 4))
    return r

def get_repo_by_name(name, r):
    repo_data = {}
    for entry in r:
        if entry.get("name") == name:
            repo_data = entry
            break
    # print(json.dumps(repo_data, indent= 2))        
    return repo_data

def get_repo_commits(r):
    commits_url = r.get("commits_url")
    # print(commits_url)
    if commits_url.endswith('{/sha}'):
        commits_url = commits_url[:-6]
    commits_url += "?page="
    commits_r_t = []
    for x in range(5):
        commits_url_t = "{url}{index}".format(url=commits_url,index=x+1)
        # print(commits_url_t)
        commits_r = requests.get(commits_url_t, headers={}, auth=('bendunnegyms', '2c6b7ed1bd7ab86dc1bf7ae5e3622415f5c252ac'))
        # print(json.dumps(json.loads(commits_r.text), indent= 4))
        if len(json.loads(commits_r.text)) == 0:
            break
        commits_r_t.extend(json.loads(commits_r.text))

    # print(json.dumps(commits_r_t, indent = 4))
    return commits_r_t

def format_date(date):
    f = date.split("T")
    time = f[1].split("Z")[0]
    res = "{date} - {time}".format(date = f[0], time = time)
    return res

def dagify_commits(r):
    # get latest commit, add as target with parent as source
    network_graph = {"nodes": [], "links": []}
    sha_data = []
    for commit in r:
        sha_data.append(commit.get("sha"))
        
    nodes = []
    links = []
    first = True
    for commit in r:
        # build node
        commit_as_dict = {"id": "", "date": "", "metadata": ""}
        c_sha = commit.get("sha")
        commit_as_dict["id"] = c_sha
        c_data = commit.get("commit")
        c_author = c_data.get("author").get("name")
        c_date = c_data.get("author").get("date")
        c_date = format_date(c_date)
        c_message = c_data.get("message")
        day = c_date.split(" ")[0]
        if first:
            day += " - LATEST"
        commit_as_dict["date"] = day
        metadata = "Message: {message} \nDate: {c_date} \nAuthor: {c_author}".format(message = c_message, c_date = c_date, c_author = c_author)
        if first:
            metadata += "\nLATEST COMMIT"
            first = False
        commit_as_dict["metadata"] = metadata
        nodes.append(commit_as_dict)

        #add links
        parents = commit.get("parents")
        for parent in parents:
            parent_sha = parent.get("sha")
            if parent.get("sha") in sha_data:
                link = {"source" : parent_sha, "target" : c_sha}
                links.append(link)
        
    network_graph["nodes"] = nodes
    network_graph["links"] = links
    # print(json.dumps(network_graph, indent= 2))
    with open("../vis/data/network_graph.json", "w") as fp:
        json.dump(network_graph, fp)


def bar_chart_data(r):
    bar_chart_graph_t = {}
    bar_chart_graph = []
    for commit in r:
        c_data = commit.get("commit")
        author = c_data.get("author").get("name")
        if author not in bar_chart_graph_t:
            bar_chart_graph_t[author] = {"author":author, "commits": 1}
        else:
            (bar_chart_graph_t[author])["commits"] += 1

    for entry in bar_chart_graph_t:
        bar_chart_graph.append(bar_chart_graph_t.get(entry))

    # print(bar_chart_graph)
    with open("../vis/data/bar_chart_data.json", "w") as fp:
        json.dump(bar_chart_graph, fp)

         


def loads_data(username_repo):
    
    git_user = username_repo.split("/")[0]
    git_repo = username_repo.split("/")[1]

    # print(git_repo, " ", git_user)
    r = json.loads(query(git_user).text)
    repo_data = get_repo_by_name(git_repo, r)
    repo_commits_data = get_repo_commits(repo_data)
    dagify_commits(repo_commits_data)
    bar_chart_data(repo_commits_data)
    # add more stuff here for bar chart data 

def rate_limit_test():
    headers = {}
    url = 'https://api.github.com/rate_limit'
    r = requests.get(url, headers=headers, auth=('bendunnegyms', '2c6b7ed1bd7ab86dc1bf7ae5e3622415f5c252ac'))
    print(r.text)

if __name__ == "__main__":
    rate_limit_test()
    # r = json.loads(query("bendunnegyms").text)
    # repo_data = get_repo_by_name("SWENG-2", r)
    #print(json.dumps(repo_data, indent= 2))
    # dagify_commits(get_repo_commits(repo_data))
    