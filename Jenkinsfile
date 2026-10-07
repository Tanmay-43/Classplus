pipeline {
    agent any
    environment {
        IMAGE = 'attendance-app'
        CONTAINER = 'attendance-app'
    }
    stages {
        stage('Clone Repository') {
            steps { checkout scm }
        }
        stage('Install Dependencies') {
            steps {
                sh 'python3 -m venv venv'
                sh './venv/bin/pip install -r requirements.txt'
            }
        }
        stage('Test Application') {
            steps {
                sh '''./venv/bin/python - <<'PY'
from app import app
c = app.test_client()
assert c.get("/login").status_code == 200
assert c.get("/health").status_code == 200
assert c.get("/dashboard").status_code == 302
r = c.post("/login", data={"username": "admin", "password": "admin123"})
assert r.status_code == 302
assert c.get("/dashboard").status_code == 200
assert len(c.get("/api/data").json["students"]) >= 10
print("All tests passed")
PY'''
            }
        }
        stage('Build Docker Image') {
            steps { sh "docker build -t ${IMAGE}:${BUILD_NUMBER} -t ${IMAGE}:latest ." }
        }
        stage('Deploy Container') {
            steps {
                sh "docker rm -f ${CONTAINER} || true"
                sh "docker run -d --name ${CONTAINER} -p 5000:5000 ${IMAGE}:latest"
            }
        }
    }
    post {
        success { echo 'AttendEase deployed at http://localhost:5000' }
        failure { echo 'Pipeline failed. Check the stage logs.' }
    }
}
