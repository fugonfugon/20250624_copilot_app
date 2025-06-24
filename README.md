確認事項
back/.envにてgemini apiの管理

ターミナル1
cd backend
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

ターミナル2
cd frontend
npm install
npm run dev
