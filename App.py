import streamlit as st
import google.generativeai as genai

# 1. إعداد الصفحة
st.set_page_config(page_title="Math AI Tutor", layout="wide")
st.title("🧮 Math & Science AI Assistant")

# 2. إدخال المفتاح
api_key = st.sidebar.text_input("Enter Google API Key:", type="password")

# تعليمات النظام عشان المعادلات تظهر صح
sys_instruct = """
You are an expert Math/Physics tutor.
1. CRITICAL: NEVER use code blocks (```) for math.
2. Use LaTeX with $ for inline math and $$ for block math.
3. Respond in professional Arabic.
"""

if api_key:
    genai.configure(api_key=api_key)
    
    # استخدام الموديل مع التعليمات
    model = genai.GenerativeModel(
        'gemini-1.5-pro', 
        system_instruction=sys_instruct
    )

    # خانة السؤال
    prompt = st.chat_input("اكتب مسألتك هنا...")

    if prompt:
        # عرض سؤال المستخدم
        with st.chat_message("user"):
            st.write(prompt)

        # تحضير الإجابة
        with st.chat_message("assistant"):
            try:
                response = model.generate_content(prompt)
                # السطر السحري عشان المعادلات تترسم
                st.markdown(response.text, unsafe_allow_html=True) 
            except Exception as e:
                st.error(f"Error: {e}")

else:
    st.warning("Please enter your API Key in the sidebar to start.")