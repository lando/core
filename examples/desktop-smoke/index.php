<?php

$database = new mysqli('database', 'lamp', 'lamp', 'lamp');

if ($database->connect_errno) {
  http_response_code(500);
  exit('database connection failed');
}

echo 'lando-lamp-https-is-working';
