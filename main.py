import os
import json
from dotenv import load_dotenv
from openai import OpenAI
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=api_key)
sessions = {}

def get_session(session_id: str):
    if session_id not in sessions:
        sessions[session_id] = {
            "current_answer": None,
            "current_question": None,
            "current_options": [],
            "question_count": 0,
            "correct_count": 0,
            "wrong_questions": [],
            "asked_questions": [],
            "session_started": False,
            "current_question_recorded_wrong": False,
        }
    return sessions[session_id]

@app.get("/question")
def question(grade: str, topic: str, session_id: str):
    # --- הגנה: בדיקה אם הנושא מתמטי ---
    validation_prompt = f"Is the topic '{topic}' related to mathematics? Answer only 'yes' or 'no'."
    check = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": validation_prompt}]
    )
    if "no" in check.choices[0].message.content.lower():
        # מחזיר שגיאה שה-Frontend יוכל להציג
        raise HTTPException(status_code=400, detail="יש לבחור נושא מתמטי בלבד")

    session = get_session(session_id)
    
    if not session["session_started"]:
        session.update({"question_count": 0, "correct_count": 0, "wrong_questions": [], "asked_questions": [], "session_started": True})
    
    if session["question_count"] >= 10:
        return {"end": True}

    previous_questions = ", ".join(session["asked_questions"])

    # Prompt
    prompt = f"""
    Generate a math question for grade {grade}, topic {topic}.
    
    CRITICAL RULES:
    1. The 'question' field MUST be a clean math expression.
    2. VERIFICATION: You must calculate the result step-by-step internally. 
    3. THE CORRECT ANSWER MUST BE ONE OF THE 4 OPTIONS.
    4. VARIETY: Do NOT repeat: [{previous_questions}].
    5. FORMAT: Return exactly 4 options as strings.
    
    Return ONLY JSON: 
    {{"question": "expression", "options": ["ans1", "ans2", "ans3", "ans4"], "correct_answer": "correct_one"}}
    """

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a professional mathematician. You solve the problem first, then verify that the correct answer is present in the options list. You never provide wrong answers."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"}
    )
    
    parsed = json.loads(response.choices[0].message.content)
    
    session["asked_questions"].append(parsed["question"])
    session["question_count"] += 1
    session.update({
        "current_answer": str(parsed["correct_answer"]).strip(),
        "current_question": parsed["question"],
        "current_options": parsed["options"],
        "current_question_recorded_wrong": False
    })

    return parsed

@app.get("/answer")
def answer(user_answer: str, session_id: str):
    session = get_session(session_id)
    # ניקוי רווחים והשוואה חכמה
    is_correct = str(user_answer).strip() == str(session["current_answer"]).strip()

    if is_correct:
        session["correct_count"] += 1
        return {"status": "correct"}

    if not session["current_question_recorded_wrong"]:
        session["wrong_questions"].append({
            "question": session["current_question"], 
            "correct_answer": session["current_answer"]
        })
        session["current_question_recorded_wrong"] = True

    expl_prompt = f"""
    Explain how to solve {session['current_question']} step-by-step in Hebrew.
    The correct answer is {session['current_answer']}.
    Use a 'Recipe' format. 
    Break it down to the smallest steps.
    No LaTeX.
    """
    expl_res = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": expl_prompt}]
    )
    
    return {"status": "explained", "explanation": expl_res.choices[0].message.content}

@app.get("/summary")
def summary(session_id: str):
    return get_session(session_id)