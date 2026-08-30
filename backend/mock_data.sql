-- Mock Users
INSERT OR IGNORE INTO users (id, created_at) VALUES 
('dev-user', '2026-08-29T07:00:00.000Z'),
('bharathi_fan', '2026-08-29T07:01:00.000Z'),
('tamil_schol', '2026-08-29T07:02:00.000Z'),
('casual_reader', '2026-08-29T07:03:00.000Z');

-- Mock Books
INSERT OR REPLACE INTO books (id, title, author, summary, language, total_chapters, status, published_at) VALUES 
('ponniyin_selvan', 'பொன்னியின் செல்வன்', 'கல்கி ரா. கிருஷ்ணமூர்த்தி', 'சோழப் பேரரசின் வரலாற்றுப் புதினம். அருண்மொழிவர்மனின் இளமைக் காலப் பின்னணியைக் கொண்டது.', 'ta', 3, 'published', '2026-08-27T13:46:28.589Z'),
('deiva_yaanai', 'தெய்வ யானை', 'திருப்புகழ் சாமிகள்', 'முருகப் பெருமானின் தெய்வீகக் கதைகள் மற்றும் ஆன்மீக விளக்கங்கள்.', 'ta', 2, 'published', '2026-08-27T13:43:36.902Z'),
('mock_book', 'மாதிரி புத்தகம் (Test Book)', 'சோதனை ஆசிரியர்', 'விமர்சன மேலாண்மை மற்றும் அணுகல் தன்மையைச் சோதிப்பதற்கான ஒரு மாதிரிப் புத்தகம்.', 'ta', 2, 'published', '2026-08-29T07:00:00.000Z');

-- Mock Chapters
INSERT OR REPLACE INTO chapters (id, book_id, idx, title, word_count) VALUES
('ps_ch1', 'ponniyin_selvan', 0, 'புது வெள்ளம்', 2500),
('ps_ch2', 'ponniyin_selvan', 1, 'ஆதித்த கரிகாலன்', 3100),
('ps_ch3', 'ponniyin_selvan', 2, 'விண்ணகரக் கோயில்', 2200),
('dy_ch1', 'deiva_yaanai', 0, 'அவதாரம்', 1500),
('dy_ch2', 'deiva_yaanai', 1, 'திருமணம்', 1800),
('mb_ch1', 'mock_book', 0, 'அறிமுகம் (Introduction)', 800),
('mb_ch2', 'mock_book', 1, 'முடிவுரை (Conclusion)', 950);

-- Mock Reviews
INSERT OR REPLACE INTO reviews (id, book_id, user_id, rating, reviestatusw_text, ishidden, created_at) VALUES
('rev_1', 'ponniyin_selvan', 'tamil_schol', 5, 'தமிழ் இலக்கியத்தின் சிகரம்! கதாபாத்திர வடிவமைப்பு மற்றும் வரலாற்று விவரிப்புகள் அற்புதம்.', 0, '2026-08-29T07:10:00.000Z'),
('rev_2', 'ponniyin_selvan', 'casual_reader', 4, 'மிகவும் விறுவிறுப்பான கதைக்களம். ஆனால் சில இடங்களில் விவரணைகள் அதிகமாக உள்ளன.', 0, '2026-08-29T07:15:00.000Z'),
('rev_3', 'ponniyin_selvan', 'bharathi_fan', 5, 'சோழர் கால வரலாற்றுப் பயணம். மீண்டும் மீண்டும் படிக்கத் தூண்டும் காவியம்!', 0, '2026-08-29T07:20:00.000Z'),
('rev_4', 'mock_book', 'dev-user', 5, 'அருமையான மாதிரிப் புத்தகம்! விமர்சன மேலாண்மை அம்சம் சரியாகச் செயல்படுகிறது.', 0, '2026-08-29T07:49:58.194Z'),
('rev_5', 'mock_book', 'casual_reader', 3, 'சாதாரண மாதிரிப் புத்தகம் தான். சோதனைகளுக்கு மட்டுமே பயன்படும்.', 0, '2026-08-29T07:30:00.000Z'),
('rev_6', 'deiva_yaanai', 'bharathi_fan', 4, 'பக்திப் பூர்வமான ஆன்மீக நூல். மன அமைதி தருகிறது.', 0, '2026-08-29T07:35:00.000Z');
