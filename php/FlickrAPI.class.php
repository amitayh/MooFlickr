<?php

class FlickrAPI {
    
    const REST_URL              = 'http://api.flickr.com/services/rest/';
    const IMAGE_URL             = 'http://farm%s.static.flickr.com/%s/%s_%s%s.jpg';
    
    const IMAGE_SIZE_SQUARE     = '_s';
    const IMAGE_SIZE_THUMB      = '_t';
    const IMAGE_SIZE_SMALL      = '_m';
    const IMAGE_SIZE_MEDIUM     = '';
    const IMAGE_SIZE_LARGE      = '_b';
    
    const MEDIA_TYPE_ALL        = 'all';
    const MEDIA_TYPE_PHOTOS     = 'photos';
    const MEDIA_TYPE_VIDEOS     = 'videos';
    
    public $api_key;
    
    public function __construct($api_key) {
        $this->api_key = (string) $api_key;
    }
    
    public function call($method, $params) {
        $response = file_get_contents($this->getActionUrl($method, $params));
        return array_map(array($this, '_cleanNodes'), unserialize($response));
    }
    
    public function getActionUrl($method, $params) {
        $params['method'] = $method;
        $params['api_key'] = $this->api_key;
        $params['format'] = 'php_serial';
        return self::REST_URL . '?' . http_build_query($params, '', '&');
    }
    
    public function getPhotosetList($user_id, $thumbnail_size = self::IMAGE_SIZE_SQUARE) {
        $result = $this->call('flickr.photosets.getList', array('user_id' => $user_id));
        if ($result !== false && isset($result['stat']) && $result['stat'] == 'ok') {
            $photosets = $result['photosets']['photoset'];
            foreach ($photosets as &$photoset) {
                $photoset['thumbnail'] = self::getImageUrl(
                    $photoset['farm'],
                    $photoset['server'],
                    $photoset['primary'],
                    $photoset['secret'],
                    $thumbnail_size
                );
                unset($photoset['farm'], $photoset['server'], $photoset['primary'], $photoset['secret']);
            }
            return $photosets;
        }
        return false;
    }
    
    public function getPhotosetPhotos($photoset_id, $per_page = 500, $page = 1, $media = self::MEDIA_TYPE_PHOTOS) {
        $result = $this->call(
            'flickr.photosets.getPhotos',
            array(
                'photoset_id'    => $photoset_id,
                'per_page'       => $per_page,
                'page'           => $page,
                'media'          => $media
            )
        );
        if ($result !== false && isset($result['stat']) && $result['stat'] == 'ok') {
            return $result['photoset'];
        }
        return false;
    }
    
    public static function getImageUrl($farm, $server, $primary, $secret, $size = self::IMAGE_SIZE_MEDIUM) {
        return sprintf(self::IMAGE_URL, $farm, $server, $primary, $secret, $size);
    }
    
    protected function _cleanNodes($node) {
        if (!is_array($node) || count($node) == 0) {
            return $node;
        } elseif (count($node) == 1 && array_key_exists('_content', $node)) {
            return $node['_content'];
        } else {
            return array_map(array($this, '_cleanNodes'), $node);
        }
    }
    
}