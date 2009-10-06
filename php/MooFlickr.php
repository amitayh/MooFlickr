<?php

define('FLICKR_API_KEY', 'YOUR API KEY');

include './FlickrAPI.class.php';
$flickr = new FlickrAPI(FLICKR_API_KEY);

$result = null;
if (isset($_REQUEST['action'])) {
    switch ($_REQUEST['action']) {
        case 'getPhotosetList':
            $result = $flickr->getPhotosetList($_REQUEST['user_id']);
            break;
            
        case 'getPhotosetPhotos':
            $result = $flickr->getPhotosetPhotos($_REQUEST['photoset_id']);
            break;
    }
}

$response = json_encode($result);

header('Content-Type: application/json');
header('Content-Length: ' . strlen($response));
echo $response;

exit();