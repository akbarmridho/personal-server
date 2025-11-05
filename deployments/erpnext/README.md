# Create site with primary domain

./create-site.sh --site-name erpnext.akbarmr.dev --admin-password admin

# Add the second domain to the same site

docker compose exec backend bench --site erpnext.akbarmr.dev add-to-hosts personal-01
