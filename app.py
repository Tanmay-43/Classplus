import random
from datetime import date, timedelta
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session, jsonify

app = Flask(__name__)
app.secret_key = "attendease-dev-secret"
USERS = {"admin": "admin123"}
SUBJECTS = ["Data Structures", "DBMS", "Operating Systems", "Computer Networks", "Mathematics"]
NAMES = [("Aarav Sharma", "CSE-A"), ("Diya Patel", "CSE-A"), ("Rohan Mehta", "CSE-A"), ("Ananya Iyer", "CSE-A"),
         ("Kabir Singh", "CSE-B"), ("Meera Nair", "CSE-B"), ("Vihaan Gupta", "CSE-B"), ("Isha Reddy", "CSE-B"),
         ("Arjun Verma", "IT-A"), ("Sanya Kapoor", "IT-A"), ("Neil D'Souza", "IT-A"), ("Tara Joshi", "IT-A")]


def build_data():
    rnd = random.Random(7)
    students = []
    for i, (name, cls) in enumerate(NAMES, 1):
        p = [0.95, 0.9, 0.82, 0.78, 0.7, 0.88, 0.55, 0.93, 0.62, 0.8, 0.5, 0.91][i - 1]
        total = 40
        hist = [{"date": str(date.today() - timedelta(days=k)), "subject": rnd.choice(SUBJECTS),
                 "status": "Present" if rnd.random() < p else rnd.choice(["Absent", "Late"])} for k in range(1, 9)]
        first = name.split()[0].lower()
        students.append({"id": i, "name": name, "roll": f"{cls.split('-')[0]}{21000 + i}", "cls": cls,
                         "dept": "Computer Science" if cls.startswith("CSE") else "Information Technology",
                         "email": f"{first}@college.edu", "phone": f"98765{43200 + i}",
                         "present": round(total * p), "total": total, "history": hist,
                         "today": {"subject": rnd.choice(SUBJECTS), "status": rnd.choices(["Present", "Absent", "Late"], [7, 2, 1])[0]}})
    classes = [{"name": "CSE-A", "dept": "Computer Science", "faculty": "Dr. R. Kulkarni"},
               {"name": "CSE-B", "dept": "Computer Science", "faculty": "Prof. S. Menon"},
               {"name": "IT-A", "dept": "Information Technology", "faculty": "Dr. P. Banerjee"}]
    subjects = [{"name": s, "cls": c["name"], "faculty": f} for s, c, f in zip(
        SUBJECTS, [classes[0], classes[0], classes[1], classes[1], classes[2]],
        ["Prof. A. Rao", "Dr. L. Fernandes", "Prof. V. Shah", "Dr. K. Pillai", "Prof. N. Das"])]
    return {"students": students, "classes": classes, "subjects": subjects}


def login_required(f):
    @wraps(f)
    def wrap(*a, **k):
        return f(*a, **k) if session.get("user") else redirect(url_for("login"))
    return wrap


@app.route("/", methods=["GET", "POST"])
@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        u, p = request.form.get("username", "").strip(), request.form.get("password", "")
        if USERS.get(u) == p:
            session["user"] = u
            return redirect(url_for("dashboard"))
        error = "Invalid username or password."
    return render_template("login.html", error=error)


@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html", user=session["user"])


@app.route("/api/data")
@login_required
def api_data():
    return jsonify(build_data())


@app.route("/health")
def health():
    return jsonify(status="ok")


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
