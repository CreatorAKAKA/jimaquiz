from database import init_db, create_group, create_set, load_groups

init_db()

create_group("アニメ")

groups = load_groups()
anime_id = next(
    group["id"]
    for group in groups
    if group["name"] == "アニメ"
)

create_set(anime_id, "物語シリーズ")

print(load_groups())
