<?php
header("Content-Type: application/json");
echo json_encode([
    "method" => $_SERVER["REQUEST_METHOD"],
    "content_type" => $_SERVER["CONTENT_TYPE"] ?? '',
    "post" => $_POST,
    "input" => file_get_contents("php://input")
]);
?>
