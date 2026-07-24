# MATCALL System Requirements & Rules

## 🚫 Critical Git Policy
* **ห้ามทำการ Push ขึ้น GitHub (git push) เด็ดขาดจนกว่าจะมีคำสั่งโดยตรงจากผู้ใช้งาน**

## ✉️ Email Recipients Rules (CC/TO Routing)
* **ไม่มีคอลัมน์ PAN EMAILS ในตารางโรงงาน (`plants`) อีกต่อไป**
* รายชื่อผู้รับ **PAN EMAILS** ทั้งหมดจะถูกเก็บแยกและผูกอยู่กับ **ข้อมูลของ Supplier รายรายการ** (ตามวัตถุดิบและโรงงานที่จัดส่ง) แทน
* **การแสดงผล PAN EMAILS ในระบบ:**
  * แยกประเภทอีเมลผู้รับตามโดเมนและตกแต่งด้วยสี (Badges) เพื่อให้เห็นชัดเจน:
    * 🔵 **`@sermsukplc.com`**: สีฟ้า (Sky-Blue)
    * 🟠 **`@oishigroup.com`**: สีส้ม/เหลือง (Amber)
    * 🟢 **`@thaibev.com`**: สีเขียว (Emerald)
    * ⚪ **โดเมนอื่นๆ**: สีเทา (Slate)

## 📅 Date Formatting
* รูปแบบวันที่สำหรับการกรอกและแสดงผลข้อมูลสัญญาหรือโควต้าของ Supplier ต้องแสดงผลในรูปแบบ **`dd/mm/yyyy`** เท่านั้น (ใช้ flatpickr มาช่วยในเรื่องปฏิทินและการพิมพ์)

## 👤 App Users & Permission Settings
* **การจำกัดสิทธิ์หน้า EmailJS:**
  * การตั้งค่า EmailJS ส่วนตัว (Service ID, Template ID, Public Key) จะแสดงให้กรอกเฉพาะผู้ใช้งานที่มี แผนก (Department) เป็น **'แผนกคลังวัตถุดิบ (Warehouse)'** เท่านั้น
* **โครงสร้างฟิลด์ใน User Modal (เรียงลำดับจากบนลงล่าง):**
  1. โรงงานที่จำกัดสิทธิ์ (usr-plant)
  2. แผนก (usr-department)
  3. รหัสพนักงาน (usr-username)
  4. ชื่อ-นามสกุล (usr-name)
  5. Email ผู้ส่ง (usr-email)
  6. รหัสผ่าน (usr-password)
  7. บทบาท (usr-role)
* **ขนาดกล่องข้อความและ Layout:**
  * ปรับให้เป็นแบบ 2 คอลัมน์ (Grid Layout) กว้างขึ้น ไม่บีบแคบ และไม่มี scrollbar
  * ความสูงของ Input และ Dropdown ใน Modals ทุกอันต้องมีขนาดสูงเท่ากัน (`height: 36px`)
