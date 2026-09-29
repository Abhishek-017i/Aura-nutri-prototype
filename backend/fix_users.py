import os

f = "app/routers/users.py"
with open(f, "r", encoding="utf-8") as file:
    content = file.read()

old_code = 'raise AppError("user_not_found", "User not found", status=404)'
new_code = '''user = User(id=user_id, username=f"recovered_{user_id[:8]}", name="Recovered User", phase=None)
        db.add(user)
        db.commit()
        db.refresh(user)'''

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(f, "w", encoding="utf-8") as file:
        file.write(content)
    print(f"Updated {f}")
