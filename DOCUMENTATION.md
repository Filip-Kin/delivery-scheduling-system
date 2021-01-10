## Objects

### User

```
id: string
name: string
email: string
password: string
role: 0 | 1 | 2
reset_password: boolean
```

```
ADMIN_ROLE = 0;
EDITOR_ROLE = 1;
VIEWER_ROLE = 2;
```

## Endpoints

### Public

| Method | Path           | Payload         | Response                                            |
| ------ | -------------- | --------------- | --------------------------------------------------- |
| POST   | `/user/login`  | email, password | User object or reset password error or unauthorized |
| POST   | `/user/auth`   | id, password    | User object or reset password error or unauthorized |

### Viewer permission

*All authenticated endpoints need the id and password in the header*

| Method | Path             | Payload  | Response         |
| ------ | ---------------- | -------- | ---------------- |
| POST   | `/user/password` | password | success or error |

### Editor permission

| Method | Path                          | Payload                        | Response                |
| ------ | ----------------------------- | ------------------------------ | ----------------------- |

### Admin permission

| Method | Path                      | Payload                     | Response             |
| ------ | ------------------------- | --------------------------- | -------------------- |
| POST   | `/user/`                  | name, email, password, role | User object or error |
| POST   | `/user/:id/resetpassword` | password                    | success or error     |
