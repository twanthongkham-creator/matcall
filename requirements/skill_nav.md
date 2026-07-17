# คู่มือการปรับปรุงระบบเมนูนำทาง (Skill Navigation Improvement Guide)

เอกสารฉบับนี้จัดทำขึ้นเพื่อเป็นแนวทางในการนำโค้ดแอนิเมชันปุ่มกดสไตล์ **"Magic Spring Animation"** (ไอคอนเด้งดึ๋งและลอยเหนือแถบเมนู) ไปประยุกต์ใช้ร่วมกับระบบเดิมที่คุณมีอยู่ โดยแบ่งออกเป็นขั้นตอนการเตรียมโครงสร้าง การตั้งค่าตัวแปร CSS และการผูกคำสั่ง JavaScript

---

## 1. การเตรียมโครงสร้าง HTML (Structure Integration)
หัวใจสำคัญที่จะทำให้ CSS จากโครงสร้างเดิมทำงานร่วมกับแอนิเมชันนี้ได้ คือการจัดลำดับชั้นของ Element และการใช้ Attribute `aria-current="page"` เพื่อระบุสถานะปุ่มปัจจุบัน

### ข้อกำหนดสำหรับ HTML เดิมของคุณ:
1. แท็กที่ครอบปุ่มทั้งหมด (เช่น คลาส `.nav-items`) จะต้องกำหนดเป็น `position: absolute` หรือ `position: relative` เพื่อควบคุมขอบเขตระยะลอยตัว
2. ปุ่มแต่ละปุ่ม (เช่น แท็ก `<a>` หรือ `<button>`) จะต้องระบุไอคอนไว้ภายในแท็กที่มีคลาส `.nav-icon-frame`
3. ต้องเตรียม Element พื้นหลังพิเศษไว้ 1 ตัว (เช่น คลาส `.nav-indicator-bg`) วางไว้ระดับเดียวกับกลุ่มปุ่ม เพื่อใช้ทำเอฟเฟกต์วงกลมสีวิ่งตามไอคอน

### ตัวอย่างโครงสร้างที่แนะนำ:
```html
<div class="nav-container">
    <!-- 1. ส่วนเสริม: วงกลมพื้นหลังที่จะวิ่งตามไอคอน (ต้องอยู่ใต้กลุ่มปุ่ม) -->
    <div class="nav-indicator-bg"></div>

    <!-- 2. กลุ่มปุ่มนำทาง -->
    <nav class="nav-items">
        <button class="nav-button" aria-current="page">
            <div class="nav-icon-frame">
                <i class="icon-home"></i> <!-- แทนที่ด้วยแท็กไอคอนของระบบเดิม -->
            </div>
        </button>
        <button class="nav-button">
            <div class="nav-icon-frame">
                <i class="icon-user"></i>
            </div>
        </button>
        <button class="nav-button">
            <div class="nav-icon-frame">
                <i class="icon-heart"></i>
            </div>
        </button>
        <button class="nav-button">
            <div class="nav-icon-frame">
                <i class="icon-settings"></i>
            </div>
        </button>
    </nav>
</div>
```

---

## 2. การตั้งค่าสไตล์ CSS (Styles & Variables)
นำโค้ดด้านล่างนี้ไปรวมเข้ากับไฟล์ CSS เดิมของคุณ โดยสังเกตส่วนของ `:root` ซึ่งเป็นตัวแปรสำคัญที่ระบบเดิมต้องประกาศค่าไว้เพื่อให้แอนิเมชันทำงานได้อย่างถูกต้อง

```css
/* ==========================================================================
   1. การประกาศตัวแปรส่วนกลาง (CSS Variables)
   ========================================================================== */
:root {
    --shape-rise: 15px;            /* ระยะความสูงที่ขยับขึ้นของแผงเมนู */
    --icon-muted: #a6a6a6;         /* สีของไอคอนตอนปกติ (ยังไม่ถูกเลือก) */
    --icon-active: #ffffff;        /* สีของไอคอนตอนที่ถูกเลือก (Active) */
    --move-duration: 400ms;        /* ความเร็วในการเคลื่อนที่ของแอนิเมชัน */
    
    /* จังหวะสปริงเด้งดึ๋ง (Spring/Overshoot Effect) หัวใจหลักของเอฟเฟกต์นี้ */
    --spring: cubic-bezier(0.68, -0.6, 0.32, 1.6); 
    
    /* ตัวแปรสีพื้นหลัง (ปรับเปลี่ยนให้เข้ากับ Theme ระบบเดิมของคุณได้ตามใจชอบ) */
    --nav-bg: #1e1e24;             /* สีพื้นหลังของแถบเมนู */
    --accent-color: #6c5ce7;       /* สีของวงกลมไฮไลท์ที่วิ่งตามไอคอน */
}

/* ==========================================================================
   2. โค้ดส่วนจัดการ Layout และ แอนิเมชันปุ่ม (อิงตามไฟล์ภาพต้นฉบับ)
   ========================================================================== */

.nav-items {
    position: absolute;
    inset: calc(-1 * var(--shape-rise)) 0 0 0; 
    display: grid;
    /* เปลี่ยนเลข 4 เป็นจำนวนปุ่มจริงในระบบของคุณ เช่น repeat(5, 1fr) หากมี 5 ปุ่ม */
    grid-template-columns: repeat(4, 1fr); 
    width: 100%;
    z-index: 10;
}

.nav-icon-frame {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border-radius: 50%;
    color: var(--icon-muted);
    transform: translateY(0) scale(1);
    /* ผูกตัวแปรความเร็วและจังหวะสปริง */
    transition: 
        transform var(--move-duration) var(--spring),
        color 220ms ease;
}

.nav-button {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    outline: none;
    -webkit-tap-highlight-color: transparent; /* ลบกรอบสีฟ้าบนสมาร์ทโฟน Android/iOS */
}

/* เอฟเฟกต์เมื่อปุ่มทำงาน (Active State) */
.nav-button[aria-current="page"] .nav-icon-frame {
    color: var(--icon-active);
    /* ไอคอนลอยตัวสูงขึ้น 31px และขยายขนาดขึ้นเล็กน้อย */
    transform: translateY(-31px) scale(1.06); 
}

/* ==========================================================================
   3. ส่วนเสริมพิเศษ: พื้นหลังวงกลมสีและขอบเว้า (Curved Mask)
   ========================================================================== */

.nav-container {
    position: relative;
    width: 100%; /* หรือกำหนดความกว้างตายตัวตามระบบเดิม เช่น 360px */
    height: 70px;
    background-color: var(--nav-bg);
    border-radius: 20px;
}

/* วงกลมไฮไลท์สีม่วงที่จะวิ่งไปอยู่ใต้ไอคอนที่กำลังลอย */
.nav-indicator-bg {
    position: absolute;
    top: -20px;
    left: 24px; /* จุดเริ่มต้นของปุ่มแรก (ปรับแต่งตามระยะ Grid ของระบบคุณ) */
    width: 42px;
    height: 42px;
    background-color: var(--accent-color);
    border-radius: 50%;
    transition: transform var(--move-duration) var(--spring);
    z-index: 5;
}

/* เทคนิคสร้างส่วนโค้งเว้าหลบไอคอนด้านซ้ายและขวา (Smooth Curves) ด้วย Box Shadow */
.nav-indicator-bg::before,
.nav-indicator-bg::after {
    content: '';
    position: absolute;
    top: 25px;
    width: 20px;
    height: 20px;
    background-color: transparent;
}

.nav-indicator-bg::before {
    left: -20px;
    border-bottom-right-radius: 20px;
    box-shadow: 6px 6px 0 0 var(--nav-bg); /* ดึงสีพื้นหลังเมนูมาสร้างขอบเว้า */
}

.nav-indicator-bg::after {
    right: -20px;
    border-bottom-left-radius: 20px;
    box-shadow: -6px 6px 0 0 var(--nav-bg);
}
```

---

## 3. การควบคุมด้วย JavaScript (Logic Integration)
หากระบบเดิมของคุณเป็นหน้าเว็บแบบ **SPA (Single Page Application)** หรือทำระบบสลับเนื้อหาด้วยสคริปต์อยู่แล้ว คุณสามารถนำ Logic การคำนวณตำแหน่งนี้ไปประยุกต์ใช้เพิ่มเติมได้เลย

### สคริปต์มาตรฐานสำหรับเว็บทั่วไป:
```javascript
const buttons = document.querySelectorAll('.nav-button');
const indicator = document.querySelector('.nav-indicator-bg');

// คำนวณความกว้างต่อหนึ่งช่วงตาราง (ปุ่มกว้างเท่าไหร่ ให้ขยับระยะพื้นหลังตามเท่านั้น)
// ตัวอย่างนี้อิงจาก Container กว้าง 360px หาร 4 ปุ่ม = ระยะขยับปุ่มละ 90px
const stepSize = 90; 

buttons.forEach((button, index) => {
    button.addEventListener('click', () => {
        // 1. เคลียร์สถานะ active จากปุ่มอื่นทั้งหมดออกก่อน
        buttons.forEach(btn => btn.removeAttribute('aria-current'));
        
        // 2. มอบสถานะ active ให้กับปุ่มที่โดนคลิกล่าสุด
        button.setAttribute('aria-current', 'page');
        
        // 3. สั่งให้พื้นหลังวงกลมวิ่งเลื่อนแนวแกน X ตามมาด้วยจังหวะสปริง
        const translationX = index * stepSize;
        indicator.style.transform = `translateX(${translationX}px)`;
    });
});
```

---

## 4. ข้อแนะนำเพิ่มเติมในการปรับปรุงระบบ
1. **การคำนวณปุ่มรองรับจอแบบยืดหยุ่น (Responsive Width):** หากแถบเมนูนำทางของคุณปรับเปลี่ยนความกว้างตามหน้าจอ (`width: 100%`) ในสคริปต์ JavaScript แนะนำให้เปลี่ยนจากการคูณด้วยค่าตายตัว (`stepSize = 90`) มาเป็นการหาตำแหน่งกึ่งกลางของปุ่มแทนด้วยคำสั่ง `button.offsetLeft` เพื่อความแม่นยำสูงสุด
2. **การจัดสไตล์ไอคอน:** หากไอคอนเดิมของคุณมีขนาดใหญ่หรือเล็กเกินไป ให้ปรับแก้ที่ Property `font-size` หรือ `width/height` ของคลาส `.nav-icon-frame` ให้สมดุลกับวงกลมพื้นหลัง
3. **การเข้ากันได้ของเบราว์เซอร์:** ฟังก์ชันการใช้แรงเหวี่ยงสปริงระบุค่าลบ (`cubic-bezier(0.68, -0.6, ...)`) รองรับการทำงานได้ดีเยี่ยมบนเว็บเบราว์เซอร์ยุคปัจจุบันทั้งหมด (Chrome, Safari, Firefox, Edge, รวมถึง Mobile Browsers)
