<?php

require_once('LibRDF/LibRDF.php');

header('Content-type: application/json');

// JSON to RDF
if (isset($_POST['toRDF'])) {
  echo '{ "status": "failed", "error": "TODO" }'; // TODO
  return;
}

// RDF to JSON:
$postdata = file_get_contents("php://input");

if (empty($postdata)) {
  echo '{ "status": "failed", "error": "no input" }';
  return;
}

$store = new LibRDF_Storage();
$model = new LibRDF_Model($store);

try {
  $model->loadStatementsFromString(new LibRDF_Parser('rdfxml'),
                                   $postdata);
} catch(LibRDF_Error $e) {
  echo '{ "status": "failed", "error": "parser error" }';
  return;
}

/* TODO
$foafKnows = new LibRDF_URINode("http://xmlns.com/foaf/0.1/knows");
$foafName = new LibRDF_URINode("http://xmlns.com/foaf/0.1/name");
$results = $model->findStatements(null, $foafKnows, null);
foreach ($results as $result) {
    $person1 = $result->getSubject();
    $person2 = $result->getObject();
    $name1 = $model->getTarget($person1, $foafName);
    $name2 = $model->getTarget($person2, $foafName);
    echo "$name1 knows $name2\n";
}
*/

echo '{ "status": "success", "data": {} }'; // TODO
