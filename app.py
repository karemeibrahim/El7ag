import streamlit as st
import google.generativeai as genai

# 1. عنوان الصفحة
st.title("My AI App 🤖")
st.write("أهلاً بيك في التطبيق بتاعي المدعوم من Gemini")

# 2. مكان عشان تحط فيه مفتاح الـ API
api_key = st.text_input("Enter Google API Key:", type="password")

# 3. إعداد الموديل وتشغيله
if api_key:
    # إعداد الاتصال بجوجل
    genai.configure(api_key=api_key)
    
    # مربع عشان المستخدم يكتب سؤاله
    prompt = st.text_input("عايز تسألني عن إيه؟")
    
    # زرار التشغيل
    if st.button("جاوبني"):
        if prompt:
            try:
                # هنا بننادي على موديل Gemini
                model = genai.GenerativeModel('gemini-pro')
                with st.spinner('جاري التفكير...'):
                    response = model.generate_content(prompt)
                
                # عرض الإجابة
                st.success("الإجابة:")
                st.write(response.text)
            except Exception as e:
                st.error(f"حصلت مشكلة: {e}")